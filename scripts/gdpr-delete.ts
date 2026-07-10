// Permanent, cascade deletion — account or single project. This is the
// "internal admin action" for GDPR-style erasure requests: there's no
// self-serve delete button (archive is the only in-app mechanism — see
// DangerZone), so a founder actions a deletion request by running this
// script by hand after confirming the request is genuine.
//
// Usage:
//   npx tsx --env-file=.env scripts/gdpr-delete.ts account <email>            # preview only
//   npx tsx --env-file=.env scripts/gdpr-delete.ts account <email> --yes      # actually delete
//   npx tsx --env-file=.env scripts/gdpr-delete.ts project <productId>        # preview only
//   npx tsx --env-file=.env scripts/gdpr-delete.ts project <productId> --yes  # actually delete
//
// Every domain table already cascades from Product/User at the database
// level (see prisma/schema.prisma's onDelete: Cascade), so a single
// user.delete()/product.delete() removes products, positioning, sources,
// scored posts, signals, tracked links, leads, and signups automatically.
// The two exceptions are RateLimitAttempt and VerificationToken, which are
// keyed by plain strings (email/userId/productId embedded in the key, not a
// real foreign key — see src/lib/rate-limit.ts and
// src/lib/services/user.service.ts), so this script deletes those
// explicitly using the same key formats those two call sites use. Nothing
// else is retained: there's no billing/invoicing system in this product
// that would require keeping records after a deletion request.
import { prisma } from "@/lib/prisma";

const LOGIN_PREFIX = "login:";
const PASSWORD_RESET_PREFIX = "password-reset:";
const VERIFY_RESEND_PREFIX = "verify-resend:";
const POLL_PREFIX = "poll:";
const VERIFY_TOKEN_PREFIX = "verify:";
const RESET_TOKEN_PREFIX = "reset:";

function printSummary(scope: string, identifier: string, counts: Record<string, number>) {
  console.log(`\n${scope} deletion preview for ${identifier}:`);
  for (const [key, value] of Object.entries(counts)) {
    console.log(`  ${key}: ${value}`);
  }
}

async function previewAccount(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      products: { select: { id: true, name: true } },
      accounts: { select: { id: true } },
      sessions: { select: { id: true } },
    },
  });
  if (!user) return null;

  const productIds = user.products.map((p) => p.id);
  const rateLimitOr = [
    { key: `${LOGIN_PREFIX}${email}` },
    { key: `${PASSWORD_RESET_PREFIX}${email}` },
    { key: `${VERIFY_RESEND_PREFIX}${user.id}` },
    ...productIds.map((id) => ({ key: `${POLL_PREFIX}${id}` })),
  ];
  const verificationTokenOr = [
    { identifier: `${VERIFY_TOKEN_PREFIX}${email}` },
    { identifier: `${RESET_TOKEN_PREFIX}${email}` },
  ];

  const [sources, positionings, trackedLinks, leads, signups, signals, scoredPosts, rateLimitAttempts, verificationTokens] =
    await Promise.all([
      prisma.source.count({ where: { productId: { in: productIds } } }),
      prisma.positioning.count({ where: { productId: { in: productIds } } }),
      prisma.trackedLink.count({ where: { productId: { in: productIds } } }),
      prisma.lead.count({ where: { productId: { in: productIds } } }),
      prisma.signup.count({ where: { productId: { in: productIds } } }),
      prisma.signal.count({ where: { source: { productId: { in: productIds } } } }),
      prisma.scoredPost.count({ where: { source: { productId: { in: productIds } } } }),
      prisma.rateLimitAttempt.count({ where: { OR: rateLimitOr } }),
      prisma.verificationToken.count({ where: { OR: verificationTokenOr } }),
    ]);

  return {
    user,
    productIds,
    rateLimitOr,
    verificationTokenOr,
    counts: {
      products: user.products.length,
      sources,
      positionings,
      trackedLinks,
      leads,
      signups,
      signals,
      scoredPosts,
      accounts: user.accounts.length,
      sessions: user.sessions.length,
      rateLimitAttempts,
      verificationTokens,
    },
  };
}

async function deleteAccount(email: string, confirmed: boolean) {
  const preview = await previewAccount(email);
  if (!preview) {
    console.log(`No account found for ${email}`);
    return;
  }

  printSummary("ACCOUNT", email, preview.counts);

  if (!confirmed) {
    console.log("\nDry run only — re-run with --yes to actually delete.");
    return;
  }

  await prisma.$transaction([
    prisma.rateLimitAttempt.deleteMany({ where: { OR: preview.rateLimitOr } }),
    prisma.verificationToken.deleteMany({ where: { OR: preview.verificationTokenOr } }),
    prisma.user.delete({ where: { id: preview.user.id } }),
  ]);

  console.log(`\nDeleted account ${email} (${preview.productIds.length} project(s)) and all associated data.`);
}

async function previewProject(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, userId: true },
  });
  if (!product) return null;

  const [sources, positionings, trackedLinks, leads, signups, signals, scoredPosts, rateLimitAttempts] =
    await Promise.all([
      prisma.source.count({ where: { productId } }),
      prisma.positioning.count({ where: { productId } }),
      prisma.trackedLink.count({ where: { productId } }),
      prisma.lead.count({ where: { productId } }),
      prisma.signup.count({ where: { productId } }),
      prisma.signal.count({ where: { source: { productId } } }),
      prisma.scoredPost.count({ where: { source: { productId } } }),
      prisma.rateLimitAttempt.count({ where: { key: `${POLL_PREFIX}${productId}` } }),
    ]);

  return {
    product,
    counts: { sources, positionings, trackedLinks, leads, signups, signals, scoredPosts, rateLimitAttempts },
  };
}

async function deleteProject(productId: string, confirmed: boolean) {
  const preview = await previewProject(productId);
  if (!preview) {
    console.log(`No project found with id ${productId}`);
    return;
  }

  printSummary("PROJECT", `${preview.product.name} (${productId})`, preview.counts);

  if (!confirmed) {
    console.log("\nDry run only — re-run with --yes to actually delete.");
    return;
  }

  await prisma.$transaction([
    prisma.rateLimitAttempt.deleteMany({ where: { key: `${POLL_PREFIX}${productId}` } }),
    prisma.product.delete({ where: { id: productId } }),
  ]);

  console.log(
    `\nDeleted project "${preview.product.name}" (${productId}) and all associated data. The account itself is untouched.`
  );
}

async function main() {
  const [, , mode, identifier] = process.argv;
  const confirmed = process.argv.includes("--yes");

  if (mode === "account" && identifier) {
    await deleteAccount(identifier, confirmed);
  } else if (mode === "project" && identifier) {
    await deleteProject(identifier, confirmed);
  } else {
    console.log(
      "Usage:\n" +
        "  npx tsx --env-file=.env scripts/gdpr-delete.ts account <email> [--yes]\n" +
        "  npx tsx --env-file=.env scripts/gdpr-delete.ts project <productId> [--yes]"
    );
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
