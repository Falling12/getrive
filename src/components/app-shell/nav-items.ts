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
// two navs can never drift out of sync. Settings is deliberately excluded
// (see SETTINGS_NAV_ITEM below) — the desktop sidebar pins it apart from
// the workflow groups, below a divider, next to the account link.
export const NAV_ITEMS = [
  { segment: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { segment: "positioning", label: "Positioning", icon: Compass },
  { segment: "signals", label: "Signals", icon: AudioLines },
  { segment: "sources", label: "Sources", icon: Hash },
  { segment: "outreach", label: "Outreach", icon: Send },
  { segment: "users", label: "Users", icon: Users },
] as const;

// Not part of NAV_ITEMS itself — the search-intelligence pipeline
// (Phase 1/2/2C/3A) is allowlist-only (see lib/limits.ts's
// UNLIMITED_ACCOUNT_EMAILS), so this entry is spliced in conditionally by
// the layout, computed server-side from the session email, rather than
// living in the base array every founder's nav renders unconditionally.
export const SEARCH_NAV_ITEM = { segment: "search", label: "Search", icon: Radar } as const;

// Rendered on its own, below a divider, on the desktop sidebar only (see
// AppSidebar) — pulled out of NAV_ITEMS so it doesn't get swept into a
// workflow group. The mobile bottom nav still lists it inline (space for a
// separate row there isn't worth the visual split at that size).
export const SETTINGS_NAV_ITEM = { segment: "settings", label: "Settings", icon: SlidersHorizontal } as const;

// Groups the desktop sidebar's workflow items (Dashboard is deliberately
// standalone at the top with no header — it's the one item that isn't
// part of either loop). "Signal ops" is the discover/configure loop
// (who you're targeting, what's found, where it's monitored); "Growth" is
// the act/measure loop (replying, and tracking who that actually acquired).
// `label: null` renders no header row, just the segments.
export const NAV_GROUPS = [
  { label: null, segments: ["dashboard"] },
  { label: "Signal ops", segments: ["positioning", "signals", "sources", "search"] },
  { label: "Growth", segments: ["outreach", "users"] },
] as const;
