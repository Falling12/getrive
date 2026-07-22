"use client";

import { useActionState, useState, useTransition } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { updateProductDetailsAction, refetchFromUrlAction } from "@/app/(app)/projects/[projectId]/settings/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const fieldClass =
  "w-full border-b border-border bg-transparent py-3 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-border focus:border-accent";
const labelClass = "font-mono text-[10px] tracking-widest text-muted-foreground uppercase";
const DESCRIPTION_MAX = 500;

export function ProductDetailsForm({
  projectId,
  defaultValues,
}: {
  projectId: string;
  defaultValues: {
    name: string;
    description: string;
    targetCustomer: string;
    websiteUrl: string;
    signupGoal: string | null;
    currentSignupCount: number;
  };
}) {
  const boundAction = updateProductDetailsAction.bind(null, projectId);
  const [state, formAction, isPending] = useActionState(boundAction, {});

  // Controlled (rather than defaultValue) only for the fields a refetch can
  // overwrite — signupGoal/currentSignupCount stay uncontrolled below since
  // nothing ever fills them in for the founder. Matches onboarding-form.tsx's
  // same reasoning: an uncontrolled field would get silently reset once the
  // action settles, wiping a fresh refetch result right after it lands.
  const [name, setName] = useState(defaultValues.name);
  const [description, setDescription] = useState(defaultValues.description);
  const [targetCustomer, setTargetCustomer] = useState(defaultValues.targetCustomer);
  const [websiteUrl, setWebsiteUrl] = useState(defaultValues.websiteUrl);
  const [refetchError, setRefetchError] = useState<string>();
  const [didRefetch, setDidRefetch] = useState(false);
  const [isRefetching, startRefetchTransition] = useTransition();

  function handleRefetch() {
    setRefetchError(undefined);
    setDidRefetch(false);
    startRefetchTransition(async () => {
      const result = await refetchFromUrlAction(websiteUrl);
      if (result.status === "error") {
        setRefetchError(result.error);
        return;
      }
      setName(result.name.slice(0, 100));
      setDescription(result.description.slice(0, DESCRIPTION_MAX));
      setTargetCustomer(result.targetCustomer.slice(0, 300));
      setDidRefetch(true);
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name" className={labelClass}>
            Product name
          </Label>
          <input
            id="name"
            name="name"
            required
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={fieldClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="websiteUrl" className={labelClass}>
            Website URL
          </Label>
          <div className="flex items-center gap-2">
            <input
              id="websiteUrl"
              name="websiteUrl"
              type="url"
              placeholder="https://example.com"
              value={websiteUrl}
              onChange={(event) => setWebsiteUrl(event.target.value)}
              className={`${fieldClass} text-accent`}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isRefetching || !websiteUrl.trim()}
              onClick={handleRefetch}
              className="shrink-0 gap-1.5 rounded-md"
            >
              <Sparkles className="size-3.5" />
              {isRefetching ? "Reading…" : "Refetch"}
            </Button>
          </div>
          {refetchError && <p className="text-sm text-destructive">{refetchError}</p>}
          {didRefetch && (
            <p className="text-xs text-accent">
              Name, description, and target customer updated below — review, then save.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="targetCustomer" className={labelClass}>
            Target customer
          </Label>
          <input
            id="targetCustomer"
            name="targetCustomer"
            value={targetCustomer}
            onChange={(event) => setTargetCustomer(event.target.value)}
            className={fieldClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="signupGoal" className={labelClass}>
            Your goal with Getrive
          </Label>
          <input
            id="signupGoal"
            name="signupGoal"
            maxLength={200}
            placeholder="e.g. Get to my first 100 real users"
            defaultValue={defaultValues.signupGoal ?? undefined}
            className={fieldClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="currentSignupCount" className={labelClass}>
            Current signups
          </Label>
          <input
            id="currentSignupCount"
            name="currentSignupCount"
            type="number"
            min={0}
            defaultValue={defaultValues.currentSignupCount}
            className={fieldClass}
          />
        </div>

        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="description" className={labelClass}>
            One-paragraph description
          </Label>
          <textarea
            id="description"
            name="description"
            required
            rows={3}
            maxLength={DESCRIPTION_MAX}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={`${fieldClass} resize-none leading-relaxed`}
          />
        </div>
      </div>

      {state.error && <p className="text-sm font-medium text-destructive">{state.error}</p>}
      {state.success && <p className="text-sm font-medium text-accent">Saved.</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending} className="group gap-2 rounded-md">
          {isPending ? "Saving…" : "Save details"}
          {!isPending && (
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          )}
        </Button>
      </div>
    </form>
  );
}
