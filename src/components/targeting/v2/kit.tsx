import type { ButtonHTMLAttributes, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Small shared bits for the v2 Targeting rebuild. Selection uses real
// native radio/checkbox inputs (just accent-colored), not an invented
// glyph — the browser's own control, not a design decision.

export function Radio(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="radio"
      {...props}
      style={{ accentColor: "var(--accent)", ...props.style }}
      className={cn("size-4 shrink-0", props.className)}
    />
  );
}

export function Checkbox(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      {...props}
      style={{ accentColor: "var(--accent)", ...props.style }}
      className={cn("size-4 shrink-0", props.className)}
    />
  );
}

export function StatusDot({ tone }: { tone: "good" | "attention" | "neutral" }) {
  return (
    <span
      className={cn(
        "inline-block size-1.5 shrink-0 rounded-full",
        tone === "attention" ? "bg-destructive" : tone === "good" ? "bg-accent" : "bg-muted-foreground/40"
      )}
      aria-hidden
    />
  );
}

export function TextAction({
  tone = "muted",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "muted" | "accent" | "destructive" }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "font-mono text-[11px] tracking-[0.1em] uppercase transition-colors disabled:pointer-events-none disabled:opacity-40",
        tone === "accent"
          ? "text-accent hover:text-accent/70"
          : tone === "destructive"
            ? "text-destructive hover:text-destructive/70"
            : "text-muted-foreground hover:text-foreground",
        className
      )}
    />
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">{children}</h3>;
}
