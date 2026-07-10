// Server-only: whether Google OAuth is provisioned, so login/signup pages
// can skip rendering the button entirely rather than showing one that 400s
// on click. Mirrors auth.ts's own Google() config, which reads these same
// two env vars.
export function isGoogleAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}
