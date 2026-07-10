// Lightweight, dependency-free bot protection for signup — no third-party
// CAPTCHA account/keys required, which real CAPTCHA (Turnstile/hCaptcha/
// reCAPTCHA) would need someone to go set up first. Two well-established
// techniques, used together:
//
// 1. Honeypot field: a form field real users never see or fill in (see
//    HoneypotField in signup-form.tsx), but naive scripted form-fillers
//    often populate every input they find. Non-empty = bot.
// 2. Minimum fill time: scripted signups tend to fetch the page and submit
//    within milliseconds; a real person takes at least a couple seconds to
//    type an email and password. Too-fast = bot.
//
// This isn't meant to stop a sophisticated, targeted attacker — it's meant
// to stop the common case of unattended scripted account creation, which is
// what email verification alone doesn't address. Deliberately fails soft
// (same generic error as any other signup failure) so a bot doesn't learn
// it was specifically detected.
const HONEYPOT_FIELD = "companyWebsite";
const TIMING_FIELD = "formRenderedAt";
const MIN_FILL_TIME_MS = 1500;

export function isLikelyBotSubmission(formData: FormData): boolean {
  const honeypot = formData.get(HONEYPOT_FIELD);
  if (typeof honeypot === "string" && honeypot.trim().length > 0) {
    return true;
  }

  const renderedAtRaw = formData.get(TIMING_FIELD);
  const renderedAt = typeof renderedAtRaw === "string" ? Number(renderedAtRaw) : NaN;
  // Missing/invalid timing field isn't itself treated as bot signal (e.g. JS
  // hydration edge cases) — only a confidently-too-fast submission is.
  if (Number.isFinite(renderedAt) && Date.now() - renderedAt < MIN_FILL_TIME_MS) {
    return true;
  }

  return false;
}

export { HONEYPOT_FIELD, TIMING_FIELD };
