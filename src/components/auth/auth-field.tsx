"use client";

import { useId, useState, type ReactNode, type InputHTMLAttributes } from "react";
import { Label } from "@/components/ui/label";

const labelClass = "font-mono text-[10px] font-medium tracking-widest text-muted-foreground uppercase";

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Rendered top-right of the label row (e.g. a "Forgot?" link). */
  labelAside?: ReactNode;
  /** Shows a small "RDY" indicator while the field is focused. */
  showReadyStatus?: boolean;
  /** Rendered inside the field, right-aligned (e.g. a show/hide password toggle). */
  trailing?: ReactNode;
  error?: string;
}

export function AuthField({
  label,
  labelAside,
  showReadyStatus,
  trailing,
  error,
  className,
  id,
  ...inputProps
}: AuthFieldProps) {
  const [focused, setFocused] = useState(false);
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={fieldId} className={labelClass}>
          {label}
        </Label>
        {showReadyStatus ? (
          <span
            className={`font-mono text-[10px] tracking-widest text-accent uppercase transition-opacity ${
              focused ? "opacity-100" : "opacity-0"
            }`}
          >
            Rdy
          </span>
        ) : (
          labelAside
        )}
      </div>
      <div className="relative">
        <input
          id={fieldId}
          onFocus={(event) => {
            setFocused(true);
            inputProps.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            inputProps.onBlur?.(event);
          }}
          className={`peer w-full border-b border-border bg-transparent py-2.5 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-accent ${trailing ? "pr-8" : ""} ${className ?? ""}`}
          {...inputProps}
        />
        {trailing}
        <span
          aria-hidden
          className={`pointer-events-none absolute bottom-0 left-0 h-[2px] w-full origin-left scale-x-0 bg-accent/50 opacity-0 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1)] ${
            focused ? "scale-x-100 opacity-100" : ""
          }`}
        />
      </div>
      {error && <p className="font-mono text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
