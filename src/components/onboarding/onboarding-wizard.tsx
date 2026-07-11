"use client";

import { useActionState, useEffect, useRef } from "react";
import { onboardingAction, type OnboardingState } from "@/app/onboarding/actions";
import { track } from "@/lib/analytics/posthog-client";
import { OnboardingBackdrop } from "@/components/onboarding/onboarding-backdrop";
import { OnboardingSidebar } from "@/components/onboarding/onboarding-sidebar";
import { AuthMark } from "@/components/auth/auth-mark";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { OnboardingLoading } from "@/components/onboarding/onboarding-loading";
import { OnboardingPositioning } from "@/components/onboarding/onboarding-positioning";
import { OnboardingResults } from "@/components/onboarding/onboarding-results";

export function OnboardingWizard() {
  const [state, formAction, isPending] = useActionState<OnboardingState, FormData>(
    onboardingAction,
    { step: "form" }
  );
  const activeStep =
    state.step === "select" ? "calibration" : state.step === "positioning" ? "positioning" : "context";

  // Fires once per real step transition — not on the initial "form" render,
  // which is just the wizard loading, not a completed step.
  const previousStep = useRef(state.step);
  useEffect(() => {
    if (state.step !== previousStep.current && !isPending) {
      track("onboarding_step_completed", { step: state.step });
      previousStep.current = state.step;
    }
  }, [state.step, isPending]);

  return (
    <div className="relative flex h-[100dvh] w-full">
      <OnboardingBackdrop />
      <OnboardingSidebar activeStep={activeStep} />

      <main className="relative z-10 h-full flex-1 overflow-y-auto">
        <div className="fixed top-0 left-0 z-50 flex w-full items-center justify-between border-b border-border bg-background/90 p-6 backdrop-blur md:hidden">
          <AuthMark withWordmark={false} />
          <span className="font-sans text-sm font-medium tracking-widest text-foreground uppercase">
            Getrive
          </span>
          <span className="font-mono text-[10px] tracking-widest text-accent uppercase">
            Step{" "}
            {activeStep === "calibration" ? "3" : activeStep === "positioning" ? "2" : "1"}/4
          </span>
        </div>

        <div className="mx-auto flex min-h-full w-full max-w-[720px] flex-col justify-center px-6 py-24 md:py-20">
          {state.step === "form" ? (
            isPending ? (
              <OnboardingLoading />
            ) : (
              <OnboardingForm
                formAction={formAction}
                pending={isPending}
                error={state.error}
              />
            )
          ) : state.step === "positioning" ? (
            isPending ? (
              <OnboardingLoading />
            ) : (
              <OnboardingPositioning
                formAction={formAction}
                productId={state.productId}
                statementCandidates={state.statementCandidates}
                recommendedStatementIndex={state.recommendedStatementIndex}
                icpCandidates={state.icpCandidates}
                recommendedIcpIndex={state.recommendedIcpIndex}
                recommendationReason={state.recommendationReason}
                error={state.error}
              />
            )
          ) : (
            <OnboardingResults productId={state.productId} suggestions={state.suggestions} />
          )}
        </div>
      </main>
    </div>
  );
}
