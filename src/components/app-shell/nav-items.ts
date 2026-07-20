import { AudioLines, Crosshair, TrendingUp, SlidersHorizontal } from "lucide-react";

// Shared between the desktop sidebar and the mobile drawer so the two navs
// can never drift out of sync. Settings is deliberately excluded (see
// SETTINGS_NAV_ITEM below) — the desktop sidebar pins it apart from the
// workflow items, below a divider, next to the account link. Three surfaces,
// ordered by the actual loop: act on what came in (Home), tune what Getrive
// listens for (Targeting), see whether it's working (Results).
export const NAV_ITEMS = [
  { segment: "home", label: "Home", icon: AudioLines },
  { segment: "targeting", label: "Targeting", icon: Crosshair },
  { segment: "results", label: "Results", icon: TrendingUp },
] as const;

// Rendered on its own, below a divider, on the desktop sidebar only (see
// AppSidebar) — pulled out of NAV_ITEMS so it doesn't get swept into the
// workflow list. The mobile drawer still lists it inline.
export const SETTINGS_NAV_ITEM = { segment: "settings", label: "Settings", icon: SlidersHorizontal } as const;
