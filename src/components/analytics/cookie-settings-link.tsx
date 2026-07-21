"use client";

// Reopens the Silktide Consent Manager's preferences modal so a visitor
// can change a prior choice. toggleModal(true) just shows the existing
// modal (reading whatever's already in localStorage) — unlike
// resetConsent(), it doesn't clear previous choices or force a fresh
// prompt. See components/analytics/consent-manager.tsx for the banner
// itself.
export function CookieSettingsLink({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.silktideConsentManager?.getInstance()?.toggleModal(true)}
      className={className}
    >
      Cookie settings
    </button>
  );
}
