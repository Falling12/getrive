import {
  LayoutGrid,
  Compass,
  AudioLines,
  Hash,
  Send,
  Users,
  SlidersHorizontal,
  Radar,
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

// Not part of NAV_ITEMS itself — the search-intelligence pipeline
// (Phase 1/2/2C/3A) is allowlist-only (see lib/limits.ts's
// UNLIMITED_ACCOUNT_EMAILS), so this entry is spliced in conditionally by
// the layout, computed server-side from the session email, rather than
// living in the base array every founder's nav renders unconditionally.
export const SEARCH_NAV_ITEM = { segment: "search", label: "Search", icon: Radar } as const;
