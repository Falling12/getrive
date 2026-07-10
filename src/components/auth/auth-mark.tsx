import { cn } from "@/lib/utils";

// The 4-bar "signal" glyph from the AIDesigner brand kit, redrawn in CSS
// rather than as an SVG/image asset (the artifact itself drew it the same
// way — stacked bars, no external asset).
export function AuthMark({
  withWordmark = true,
  className,
  style,
}: {
  withWordmark?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)} style={style}>
      <div className="flex h-5 w-6 flex-col justify-center gap-[3px]">
        <div className="h-[3px] w-full rounded-[1px] bg-foreground" />
        <div className="h-[3px] w-full rounded-[1px] bg-foreground" />
        <div className="flex w-full gap-[3px]">
          <div className="h-[3px] w-2/3 rounded-[1px] bg-foreground" />
          <div className="h-[3px] flex-1 rounded-[1px] bg-foreground" />
        </div>
      </div>
      {withWordmark && (
        <span className="font-sans text-sm font-medium tracking-widest text-foreground uppercase">
          Getrive
        </span>
      )}
    </div>
  );
}
