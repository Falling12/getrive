import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AuthMark } from "@/components/auth/auth-mark";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="w-full rounded-xl border border-border shadow-[0_0_20px_-4px_var(--accent)]">
      <CardHeader className="items-center gap-1 px-8 pt-8 text-center sm:px-10">
        <AuthMark withWordmark={false} className="mb-6 justify-center md:hidden" />
        {title && (
          <h1 className="font-sans text-xl font-medium tracking-wide text-foreground">{title}</h1>
        )}
        {subtitle && <p className="font-mono text-xs text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent className="px-8 pb-8 sm:px-10">{children}</CardContent>
    </Card>
  );
}
