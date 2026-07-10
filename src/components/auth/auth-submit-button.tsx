import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AuthSubmitButton({
  pending,
  pendingLabel,
  children,
}: {
  pending: boolean;
  pendingLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="submit"
      disabled={pending}
      size="lg"
      className="group relative mt-2 h-11 w-full gap-2 overflow-hidden rounded-md text-sm"
    >
      <span className="relative z-10">{pending ? pendingLabel : children}</span>
      {!pending && (
        <ArrowRight className="relative z-10 size-4 transition-transform group-hover:translate-x-1" />
      )}
      <span
        aria-hidden
        className="absolute inset-0 -translate-x-full bg-background/20 group-hover:animate-[auth-shimmer_1s_forwards]"
      />
    </Button>
  );
}
