"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { prefillFromUrlAction } from "@/app/onboarding/actions";

const DESCRIPTION_MAX = 500;

const fieldUnderline =
  "relative w-full border-b border-border bg-transparent py-2 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-border focus:border-accent";

export function OnboardingForm({
  formAction,
  pending,
  error,
  defaultValues,
}: {
  formAction: (formData: FormData) => void;
  pending: boolean;
  error?: string;
  defaultValues?: {
    name?: string;
    description?: string;
    targetCustomer?: string;
    signupGoal?: string | null;
  };
}) {
  // Fully controlled (rather than defaultValue) so a failed submission —
  // e.g. the AI call erroring out — never loses what the founder typed.
  // React resets uncontrolled fields once a form action settles, which would
  // otherwise silently wipe this on error.
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [description, setDescription] = useState(defaultValues?.description ?? "");
  const [targetCustomer, setTargetCustomer] = useState(defaultValues?.targetCustomer ?? "");
  const [signupGoal, setSignupGoal] = useState(defaultValues?.signupGoal ?? "");

  const [websiteUrl, setWebsiteUrl] = useState("");
  const [prefillError, setPrefillError] = useState<string>();
  const [isPrefilling, startPrefillTransition] = useTransition();

  function handlePrefill() {
    setPrefillError(undefined);
    startPrefillTransition(async () => {
      const result = await prefillFromUrlAction(websiteUrl);
      if (result.status === "error") {
        setPrefillError(result.error);
        return;
      }
      setName(result.name.slice(0, 100));
      setDescription(result.description.slice(0, DESCRIPTION_MAX));
      setTargetCustomer(result.targetCustomer.slice(0, 300));
    });
  }

  return (
    <div className="w-full">
      <header className="mb-14">
        <h1 className="mb-3 text-3xl font-medium tracking-tight text-foreground md:text-4xl">
          Define product parameters
        </h1>
        <p className="font-mono text-sm text-muted-foreground">
          Tell Getrive your product&apos;s core thesis so it can find where your real customers
          already talk about this problem.
        </p>
      </header>

      <div className="mb-10 flex flex-col gap-3 rounded-md border border-dashed border-border p-4">
        <Label
          htmlFor="websiteUrl"
          className="flex justify-between font-mono text-[11px] tracking-widest text-muted-foreground uppercase"
        >
          <span>Prefill from your website</span>
          <span className="text-border">Optional</span>
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="websiteUrl"
            type="url"
            value={websiteUrl}
            onChange={(event) => setWebsiteUrl(event.target.value)}
            placeholder="https://acme.com"
            className={`${fieldUnderline} flex-1`}
          />
          <Button
            type="button"
            variant="outline"
            disabled={isPrefilling || !websiteUrl.trim()}
            onClick={handlePrefill}
            className="shrink-0"
          >
            <Sparkles className="size-4" />
            {isPrefilling ? "Reading page…" : "Prefill fields"}
          </Button>
        </div>
        {prefillError && <p className="text-sm text-destructive">{prefillError}</p>}
      </div>

      <form action={formAction} className="flex flex-col gap-10">
        <input type="hidden" name="websiteUrl" value={websiteUrl} />
        <div className="flex flex-col gap-3">
          <Label
            htmlFor="name"
            className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase"
          >
            Product name
          </Label>
          <input
            id="name"
            name="name"
            required
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Acme Mail"
            className={`${fieldUnderline} text-2xl font-medium placeholder:text-border md:text-3xl`}
          />
        </div>

        <div className="flex flex-col gap-3">
          <Label
            htmlFor="description"
            className="flex justify-between font-mono text-[11px] tracking-widest text-muted-foreground uppercase"
          >
            <span>Core value proposition</span>
            <span className="text-border">
              Required · {description.length}/{DESCRIPTION_MAX}
            </span>
          </Label>
          <textarea
            id="description"
            name="description"
            required
            rows={3}
            maxLength={DESCRIPTION_MAX}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="We build an open-source Firebase alternative — Postgres, auth, instant APIs, and storage for developers who don't want to stitch five services together."
            className={`${fieldUnderline} resize-none leading-relaxed`}
          />
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
          <div className="flex flex-col gap-3">
            <Label
              htmlFor="targetCustomer"
              className="flex justify-between font-mono text-[11px] tracking-widest text-muted-foreground uppercase"
            >
              <span>Target customer</span>
              <span className="text-border">Optional</span>
            </Label>
            <input
              id="targetCustomer"
              name="targetCustomer"
              value={targetCustomer}
              onChange={(event) => setTargetCustomer(event.target.value)}
              placeholder="Backend engineers"
              className={fieldUnderline}
            />
          </div>

          <div className="flex flex-col gap-3">
            <Label
              htmlFor="signupGoal"
              className="flex justify-between font-mono text-[11px] tracking-widest text-muted-foreground uppercase"
            >
              <span>Your goal with Getrive</span>
              <span className="text-border">Optional</span>
            </Label>
            <input
              id="signupGoal"
              name="signupGoal"
              maxLength={200}
              value={signupGoal}
              onChange={(event) => setSignupGoal(event.target.value)}
              placeholder="e.g. Get to my first 100 real users"
              className={fieldUnderline}
            />
          </div>
        </div>

        {error && <p className="text-sm font-medium text-destructive">{error}</p>}

        <div className="mt-2 flex justify-end">
          <Button
            type="submit"
            disabled={pending}
            size="lg"
            className="group h-12 gap-2 rounded-md px-8 text-sm"
          >
            {pending ? "Analyzing…" : "Find my communities"}
            {!pending && (
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
