import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const metadata: Metadata = { title: "Onboarding — Getrive" };

// Always a fresh, blank form — this is now also the "create a new project"
// entry point (from the sidebar's project switcher), not just first-time
// setup, so there's no previous project to prefill from.
export default async function OnboardingPage() {
  await requireSession();

  return <OnboardingWizard />;
}
