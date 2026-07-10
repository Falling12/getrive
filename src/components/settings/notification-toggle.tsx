"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { updateNotificationPrefsAction } from "@/app/(app)/settings/actions";

export function NotificationToggle({
  field,
  label,
  description,
  defaultChecked,
}: {
  field: "notifyNewSignal" | "notifyWeeklyDigest";
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex flex-col gap-1 pr-4">
        <span className="text-sm text-foreground">{label}</span>
        <span className="font-mono text-[10px] text-muted-foreground">{description}</span>
      </div>
      <Switch
        checked={checked}
        disabled={isPending}
        onCheckedChange={(value) => {
          setChecked(value);
          startTransition(() => updateNotificationPrefsAction({ [field]: value }));
        }}
      />
    </div>
  );
}
