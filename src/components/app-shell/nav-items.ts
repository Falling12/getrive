import {
  LayoutGrid,
  Compass,
  AudioLines,
  Hash,
  Send,
  Users,
  SlidersHorizontal,
} from "lucide-react";

// Shared between the desktop sidebar and the mobile bottom tab bar so the
// two navs can never drift out of sync.
export const NAV_ITEMS = [
  { segment: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { segment: "positioning", label: "Positioning", icon: Compass },
  { segment: "signals", label: "Signals", icon: AudioLines },
  { segment: "sources", label: "Sources", icon: Hash },
  { segment: "outreach", label: "Outreach", icon: Send },
  { segment: "users", label: "Users", icon: Users },
  { segment: "settings", label: "Settings", icon: SlidersHorizontal },
] as const;
