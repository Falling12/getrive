import { AuthMark } from "@/components/auth/auth-mark";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    key: "context",
    label: "Establish context",
    detail: "Define parameter bounds for the listening node.",
  },
  {
    key: "positioning",
    label: "Positioning",
    detail: "Choosing your ICP and how Getrive frames your product.",
  },
  {
    key: "calibration",
    label: "Node calibration",
    detail: "Selecting the highest-fit communities based on your description.",
  },
  { key: "activate", label: "Activate listening", detail: null },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

export function OnboardingSidebar({ activeStep }: { activeStep: StepKey }) {
  const activeIndex = STEPS.findIndex((step) => step.key === activeStep);

  return (
    <aside className="relative z-20 hidden h-full w-[320px] shrink-0 flex-col border-r border-border bg-background/80 px-10 py-10 backdrop-blur-xl md:flex lg:w-[380px]">
      <AuthMark className="mb-20" />

      <nav className="relative flex-1">
        <div className="absolute top-1 bottom-10 left-[7px] w-px bg-border" />
        <div
          className="absolute top-1 left-[7px] w-px bg-accent transition-all duration-1000 ease-in-out"
          style={{ height: `${activeIndex * 88}px` }}
        />

        <ul className="relative flex flex-col gap-10">
          {STEPS.map((step, index) => {
            const isDone = index < activeIndex;
            const isActive = index === activeIndex;

            return (
              <li key={step.key} className="relative flex items-start gap-5">
                <div className="relative mt-0.5 flex size-4 items-center justify-center">
                  {isActive && (
                    <div className="absolute size-6 animate-ping rounded-full border border-accent" />
                  )}
                  <div
                    className={cn(
                      "size-2 rounded-full transition-colors duration-500",
                      isActive || isDone ? "bg-accent" : "bg-border"
                    )}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span
                    className={cn(
                      "font-mono text-[10px] tracking-widest uppercase transition-colors duration-300",
                      isActive || isDone ? "font-medium text-accent" : "text-muted-foreground/60"
                    )}
                  >
                    Phase 0{index + 1}
                  </span>
                  <span
                    className={cn(
                      "font-sans text-base font-medium transition-colors duration-300",
                      isActive || isDone ? "text-foreground" : "text-muted-foreground/60"
                    )}
                  >
                    {step.label}
                  </span>
                  {step.detail && (
                    <p
                      className={cn(
                        "mt-1 max-w-[220px] text-xs leading-relaxed transition-opacity duration-300",
                        isActive ? "text-muted-foreground opacity-100" : "opacity-0"
                      )}
                    >
                      {step.detail}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto flex items-center gap-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        <div className="size-1.5 animate-pulse rounded-full bg-accent" />
        Nothing posted without you
      </div>
    </aside>
  );
}
