// Founders type this as free prose during onboarding/settings (e.g. "Get to
// my first 100 real users") — it's documented as qualitative, not a
// guaranteed numeric field (see the Product.signupGoal schema comment).
// This is a best-effort extraction for progress framing on the Dashboard:
// the first standalone integer found, or null if the founder wrote
// something with no number in it (e.g. "get profitable").
export function parseSignupGoalTarget(signupGoal: string | null | undefined): number | null {
  if (!signupGoal) return null;
  const match = signupGoal.match(/\d[\d,]*/);
  if (!match) return null;
  const value = Number(match[0].replace(/,/g, ""));
  return Number.isFinite(value) && value > 0 ? value : null;
}
