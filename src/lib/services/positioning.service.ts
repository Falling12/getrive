import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { generatePositioning, type IcpCandidate } from "@/lib/ai/positioning";

export type { IcpCandidate };

export interface PositioningCandidatesView {
  statementCandidates: string[];
  recommendedStatementIndex: number;
  icpCandidates: IcpCandidate[];
  recommendedIcpIndex: number;
  recommendationReason: string;
}

// Shared by onboarding (first generation, runs before channel discovery) and
// the per-project Positioning page (regenerate any time). Replaces any prior
// candidates and clears a prior selection — regenerating implies the old
// selection may no longer be among the new options.
export async function regeneratePositioningCandidates(
  productId: string
): Promise<PositioningCandidatesView> {
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  const result = await generatePositioning({
    productName: product.name,
    description: product.description,
    targetCustomer: product.targetCustomer,
  });

  // Prisma's Json input type doesn't structurally accept a typed
  // interface array directly (index-signature mismatch) — round-tripping
  // through JSON is the standard escape hatch for "this is plain
  // serializable data" here.
  const icpCandidatesJson = JSON.parse(JSON.stringify(result.icpCandidates)) as Prisma.InputJsonValue;

  await prisma.positioning.upsert({
    where: { productId },
    create: {
      productId,
      statementCandidates: result.statementCandidates,
      recommendedStatementIndex: result.recommendedStatementIndex,
      icpCandidates: icpCandidatesJson,
      recommendedIcpIndex: result.recommendedIcpIndex,
      sourceDescription: product.description,
      sourceTargetCustomer: product.targetCustomer,
    },
    update: {
      statementCandidates: result.statementCandidates,
      recommendedStatementIndex: result.recommendedStatementIndex,
      icpCandidates: icpCandidatesJson,
      recommendedIcpIndex: result.recommendedIcpIndex,
      selectedStatement: null,
      selectedIcpName: null,
      selectedIcpReasoning: null,
      selectedIcpLanguage: Prisma.JsonNull,
      sourceDescription: product.description,
      sourceTargetCustomer: product.targetCustomer,
    },
  });

  return result;
}

export class InvalidPositioningSelectionError extends Error {}

// Denormalizes the chosen ICP onto flat columns (selectedIcpName/Reasoning/
// Language) rather than just storing an index into icpCandidates, so every
// other consumer (Signal Scoring's prompt, channel discovery) can read the
// selection without knowing the candidate-array shape.
export async function selectPositioning({
  productId,
  selectedStatement,
  selectedIcpIndex,
}: {
  productId: string;
  selectedStatement: string;
  selectedIcpIndex: number;
}): Promise<void> {
  const positioning = await prisma.positioning.findUniqueOrThrow({ where: { productId } });
  const icpCandidates = positioning.icpCandidates as unknown as IcpCandidate[];
  const icp = icpCandidates[selectedIcpIndex];
  if (!icp) {
    throw new InvalidPositioningSelectionError("That ICP selection is no longer valid.");
  }

  await prisma.positioning.update({
    where: { productId },
    data: {
      selectedStatement,
      selectedIcpName: icp.name,
      selectedIcpReasoning: icp.reasoning,
      selectedIcpLanguage: icp.audienceLanguage,
    },
  });
}

// True when a founder has edited the product's description/targetCustomer in
// Settings since Positioning was last (re)generated from them — nothing else
// invalidates Positioning automatically (see regeneratePositioningCandidates'
// sourceDescription/sourceTargetCustomer snapshot), so a stale selectedStatement
// or ICP can otherwise keep feeding reply/signal-scoring prompts
// indefinitely without the founder realizing it no longer matches. Only
// meaningful once a statement has actually been generated — candidates that
// were never generated aren't "stale," they're just missing.
export function isPositioningStale(
  product: { description: string; targetCustomer: string | null },
  positioning: { sourceDescription: string | null; sourceTargetCustomer: string | null } | null
): boolean {
  if (!positioning || positioning.sourceDescription === null) return false;
  return (
    positioning.sourceDescription !== product.description ||
    (positioning.sourceTargetCustomer ?? null) !== (product.targetCustomer ?? null)
  );
}

// A short, prompt-ready description of the selected ICP — used to sharpen
// Signal Scoring's relevance judgment and Source Discovery's targetCustomer
// input. Returns null when nothing's been selected yet, so
// callers can fall back to their existing behavior unchanged.
export function describeSelectedIcp(positioning: {
  selectedIcpName: string | null;
  selectedIcpReasoning: string | null;
  selectedIcpLanguage: unknown;
} | null): string | null {
  if (!positioning?.selectedIcpName) return null;

  const language = Array.isArray(positioning.selectedIcpLanguage)
    ? (positioning.selectedIcpLanguage as string[])
    : [];

  return [
    positioning.selectedIcpName,
    positioning.selectedIcpReasoning ? `— ${positioning.selectedIcpReasoning}` : null,
    language.length > 0 ? `They describe this using phrases like: ${language.join("; ")}.` : null,
  ]
    .filter(Boolean)
    .join(" ");
}
