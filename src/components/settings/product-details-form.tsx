"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { updateProductDetailsAction } from "@/app/(app)/projects/[projectId]/settings/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const fieldClass =
  "w-full border-b border-border bg-transparent py-3 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-border focus:border-accent";
const labelClass = "font-mono text-[10px] tracking-widest text-muted-foreground uppercase";

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
            defaultValue={defaultValues.name}
            className={fieldClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="websiteUrl" className={labelClass}>
            Website URL
          </Label>
          <input
            id="websiteUrl"
            name="websiteUrl"
            type="url"
            placeholder="https://example.com"
            defaultValue={defaultValues.websiteUrl}
            className={`${fieldClass} text-accent`}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="targetCustomer" className={labelClass}>
            Target customer
          </Label>
          <input
            id="targetCustomer"
            name="targetCustomer"
            defaultValue={defaultValues.targetCustomer}
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
            maxLength={500}
            defaultValue={defaultValues.description}
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
