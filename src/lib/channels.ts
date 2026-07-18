// Canonical, ordered list of channel display names Getrive currently
// monitors. SourceType (prisma/schema.prisma) is the product-logic source
// of truth, but marketing/legal copy needs plain names to enumerate in
// sentences — hand-listing them independently in half a dozen places is
// exactly how Stack Exchange and Ask MetaFilter went missing from the
// Privacy Policy, Terms, and landing copy after they shipped. Update this
// array when a channel is added or removed; any surface that lists
// channels by name should read from it instead of hardcoding its own copy.
export const MONITORED_CHANNEL_NAMES = [
  "Reddit",
  "Hacker News",
  "IndieHackers",
  "Stack Exchange",
  "Ask MetaFilter",
] as const;

// Oxford-comma joiner: "A, B, and C" (or, with conjunction: "or", "A, B, or
// C"). Pass an already-extended array — e.g.
// `[...MONITORED_CHANNEL_NAMES, "anywhere else"]` — to fold a trailing
// catch-all into the same list instead of appending it after the fact,
// which would otherwise read as a redundant second "or"/"and".
export function formatChannelList(names: readonly string[], conjunction: "and" | "or" = "and"): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} ${conjunction} ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, ${conjunction} ${names[names.length - 1]}`;
}
