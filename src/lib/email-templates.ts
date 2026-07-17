// Inline-styled HTML emails (no external CSS — most inboxes strip <style>
// blocks anyway). Getrive's actual brand palette (see DESIGN.md) — void-teal
// field, signal-white ink, field-sage as the one accent, moss-panel for
// structure. Deliberately NOT pulling in the DESIGN.md display/label fonts
// as @font-face: unlike the app, an email can't guarantee a webfont loads
// (Outlook desktop ignores it outright), so "Outfit" is listed first as a
// progressive enhancement and every stack still falls back to a plain
// system sans/mono that reads fine on its own.
const VOID_TEAL = "#0a1211";
const SIGNAL_WHITE = "#eae7e0";
const MOSS_PANEL = "#2a413a";
const FIELD_SAGE = "#4a6a5e";
const QUIET_GRAY = "#c4c4c4";

const SANS = "'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "'Source Code Pro',ui-monospace,'SFMono-Regular',Menlo,Consolas,monospace";

// DESIGN.md's spacing scale, reused here so every gap in the email is one of
// these four values instead of ad hoc pixel counts — the same idea as the
// app's own spacing tokens, just inlined (email HTML has no access to CSS
// custom properties in Outlook/older clients).
const SPACE = { sm: 12, md: 16, lg: 24, xl: 40 };

// Hidden inbox-preview snippet — without this, clients fall back to quoting
// whatever text renders first in the body (the wordmark), which wastes the
// one line most people actually decide to open an email from. The trailing
// U+00A0 run pads past Gmail/Apple Mail's ~140-char preview window so
// nothing after this leaks into the snippet.
function preheader(text: string): string {
  return `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;">${text}${" ".repeat(120)}</div>`;
}

// The 4-bar "signal" glyph from src/components/auth/auth-mark.tsx, redrawn
// as a table (email's one truly bulletproof layout primitive — Outlook's
// Word rendering engine handles nested tables far more predictably than
// flex/grid-ish div stacks) instead of the app's flex/div version. No outer
// margin of its own — the header band in wrapper() owns that spacing.
function brandMark(): string {
  const bar = (width: number) =>
    `<div style="height:3px;width:${width}px;background:${SIGNAL_WHITE};border-radius:1px;font-size:0;line-height:0;">&nbsp;</div>`;
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding-right:10px;" valign="middle">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:24px;">
            <tr><td style="padding-bottom:3px;">${bar(24)}</td></tr>
            <tr><td style="padding-bottom:3px;">${bar(24)}</td></tr>
            <tr>
              <td>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                  <td style="padding-right:3px;">${bar(15)}</td>
                  <td>${bar(6)}</td>
                </tr></table>
              </td>
            </tr>
          </table>
        </td>
        <td style="font-family:${SANS};font-size:13px;font-weight:600;letter-spacing:0.2em;color:${SIGNAL_WHITE};text-transform:uppercase;" valign="middle">
          Getrive
        </td>
      </tr>
    </table>
  `;
}

// Three bands — header (mark), body (content), footer (disclaimer) — each
// its own table row with its own hairline border, mirroring the app's own
// page shape (a bordered header band, a content area, nothing floating
// loose). Previously the mark and the footer disclaimer were just two
// paragraphs with margin stacked above/below the content, with nothing
// visually separating "brand" from "message" from "fine print" — every
// email read as one undifferentiated block of text. Cards still share the
// page's own void-teal background rather than a lighter "elevated" fill —
// per DESIGN.md, depth comes from the 1px border, not a shadow — and the
// plain-table structure throughout is the standard bulletproof-email
// tolerance for Outlook's Word rendering engine, which ignores
// border-radius/box-shadow but respects a plain table with inline styles.
function wrapper(bodyHtml: string, footer: string, preheaderText: string): string {
  return `
    ${preheader(preheaderText)}
    <div style="background:${VOID_TEAL};padding:${SPACE.xl}px ${SPACE.md}px;font-family:${SANS};">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:480px;margin:0 auto;">
        <tr>
          <td style="background:${VOID_TEAL};border:1px solid ${MOSS_PANEL};border-radius:12px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="padding:${SPACE.lg}px ${SPACE.xl}px ${SPACE.md}px;border-bottom:1px solid ${MOSS_PANEL};">
                  ${brandMark()}
                </td>
              </tr>
              <tr>
                <td style="padding:${SPACE.xl}px;">
                  ${bodyHtml}
                </td>
              </tr>
              <tr>
                <td style="padding:${SPACE.md}px ${SPACE.xl}px ${SPACE.lg}px;border-top:1px solid ${MOSS_PANEL};">
                  <p style="margin:0;font-size:12px;line-height:1.6;color:${QUIET_GRAY};">${footer}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}

// Signal White fill / Void Teal text — the app's one "primary" button
// treatment (DESIGN.md button-primary), used for every email CTA since each
// template only ever has one action, matching "one high-emphasis action".
function button(url: string, label: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:${SPACE.lg}px;">
      <tr>
        <td style="border-radius:9px;background:${SIGNAL_WHITE};">
          <a href="${url}" style="display:inline-block;padding:12px 24px;font-family:${SANS};font-size:14px;font-weight:600;color:${VOID_TEAL};text-decoration:none;border-radius:9px;">
            ${label}
          </a>
        </td>
      </tr>
    </table>
  `;
}

export function verificationEmailTemplate({ verifyUrl }: { verifyUrl: string }) {
  return {
    subject: "Verify your Getrive email",
    html: wrapper(
      `
    <h1 style="margin:0 0 12px;font-family:${SANS};font-size:22px;font-weight:500;color:${SIGNAL_WHITE};">Confirm your email</h1>
    <p style="margin:0;font-size:14px;line-height:1.6;color:${SIGNAL_WHITE};">Click below to verify your email address and finish setting up your Getrive account.</p>
    ${button(verifyUrl, "Verify email")}
    <p style="margin:${SPACE.md}px 0 0;font-size:12px;color:${QUIET_GRAY};">This link expires in 24 hours.</p>
  `,
      "If you didn't create an Getrive account, you can safely ignore this email.",
      "Confirm your email to finish setting up Getrive."
    ),
  };
}

export function passwordResetEmailTemplate({ resetUrl }: { resetUrl: string }) {
  return {
    subject: "Reset your Getrive password",
    html: wrapper(
      `
    <h1 style="margin:0 0 12px;font-family:${SANS};font-size:22px;font-weight:500;color:${SIGNAL_WHITE};">Reset your password</h1>
    <p style="margin:0;font-size:14px;line-height:1.6;color:${SIGNAL_WHITE};">Click below to choose a new password for your Getrive account.</p>
    ${button(resetUrl, "Reset password")}
    <p style="margin:${SPACE.md}px 0 0;font-size:12px;color:${QUIET_GRAY};">This link expires in 1 hour.</p>
  `,
      "If you didn't request a password reset, you can safely ignore this email.",
      "Reset your Getrive password — this link expires in 1 hour."
    ),
  };
}

// A single post, boxed off from the surrounding message the same way a
// SignalCard is boxed off from the rest of the Signals page — the title and
// excerpt used to just be two bare paragraphs sitting under the heading,
// indistinguishable at a glance from the email's own copy. Reused by
// signalRow() below for the list contexts (digest, first-signals).
function signalCard({
  title,
  meta,
  snippet,
  url,
}: {
  title: string;
  meta: string;
  snippet?: string;
  url: string;
}): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:${SPACE.sm}px;">
      <tr>
        <td style="border:1px solid ${MOSS_PANEL};border-radius:9px;padding:${SPACE.sm}px ${SPACE.md}px;">
          <a href="${url}" style="display:block;text-decoration:none;">
            <p style="margin:0;font-size:14px;font-weight:600;color:${SIGNAL_WHITE};">${title}</p>
            <p style="margin:4px 0 0;font-family:${MONO};font-size:10px;letter-spacing:0.05em;color:${QUIET_GRAY};">${meta}</p>
            ${snippet ? `<p style="margin:${SPACE.sm}px 0 0;font-size:13px;line-height:1.6;color:${QUIET_GRAY};">${snippet}</p>` : ""}
          </a>
        </td>
      </tr>
    </table>
  `;
}

export function signalAlertEmailTemplate({
  productName,
  sourceLabel,
  title,
  snippet,
  signalUrl,
}: {
  productName: string;
  sourceLabel: string;
  title: string;
  snippet: string;
  signalUrl: string;
}) {
  return {
    subject: `New signal in ${sourceLabel} — ${productName}`,
    html: wrapper(
      `
    <h1 style="margin:0 0 ${SPACE.md}px;font-family:${SANS};font-size:22px;font-weight:500;color:${SIGNAL_WHITE};">New signal found</h1>
    <p style="margin:0;font-family:${MONO};font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:${QUIET_GRAY};">${sourceLabel} · ${productName}</p>
    ${signalCard({ title, meta: "Tap to open the full post", snippet, url: signalUrl })}
    ${button(signalUrl, "View signal")}
  `,
      "You're getting this because instant signal alerts are on in your account settings.",
      `New signal in ${sourceLabel}: ${title}`
    ),
  };
}

export interface DigestSignalItem {
  title: string;
  sourceLabel: string;
  relevanceScore: number;
  url: string;
}

export interface DigestOutreachItem {
  name: string;
}

export interface DigestProjectSummary {
  name: string;
  signalsThisWeek: number;
  repliesSent: number;
  usersAcquired: number;
  dashboardUrl: string;
  signalsUrl: string;
  sourcesUrl: string;
  outreachUrl: string;
  unrepliedSignals: DigestSignalItem[];
  unrepliedSignalsTotal: number;
  unsentOutreach: DigestOutreachItem[];
  unsentOutreachTotal: number;
}

function signalRow(signal: DigestSignalItem): string {
  return signalCard({
    title: signal.title,
    meta: `${signal.sourceLabel} · <span style="color:${FIELD_SAGE};">${Math.round(signal.relevanceScore * 100)}% match</span>`,
    url: signal.url,
  });
}

// Small tracked-out uppercase mono caption — the email counterpart to
// DESIGN.md's "Mono Label" device, used here for its actual documented job
// (a functional section/status label), not as decorative marketing copy.
function sectionLabel(text: string): string {
  return `<p style="margin:0;font-family:${MONO};font-size:10px;font-weight:500;letter-spacing:0.15em;text-transform:uppercase;color:${QUIET_GRAY};">${text}</p>`;
}

// One project's "needs your attention" block, boxed as its own panel (a
// bordered/rounded sub-card, same treatment as signalCard) rather than just
// a top-border divider — with more than one project, a plain divider read
// as one continuous wall of text with faint seams; a real panel per
// project makes each one scannable on its own. Only built from sections
// that actually have content, so a project with e.g. no outreach drafts
// simply omits that sub-section rather than showing an empty heading.
function projectRow(p: DigestProjectSummary): string {
  const sections: string[] = [];

  if (p.unrepliedSignals.length > 0) {
    const more =
      p.unrepliedSignalsTotal > p.unrepliedSignals.length
        ? `<p style="margin:${SPACE.sm}px 0 0;font-size:12px;color:${QUIET_GRAY};">+${p.unrepliedSignalsTotal - p.unrepliedSignals.length} more waiting</p>`
        : "";
    sections.push(`
      <div style="margin-top:${SPACE.md}px;">
        ${sectionLabel("Unreplied signals")}
        ${p.unrepliedSignals.map(signalRow).join("")}
        ${more}
      </div>
    `);
  }

  if (p.unsentOutreach.length > 0) {
    const more =
      p.unsentOutreachTotal > p.unsentOutreach.length
        ? ` +${p.unsentOutreachTotal - p.unsentOutreach.length} more`
        : "";
    sections.push(`
      <div style="margin-top:${SPACE.md}px;">
        ${sectionLabel("Drafted, not sent")}
        <p style="margin:${SPACE.sm}px 0 0;font-size:14px;color:${SIGNAL_WHITE};">${p.unsentOutreach.map((o) => o.name).join(", ")}${more}</p>
      </div>
    `);
  }

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:${SPACE.lg}px;">
      <tr>
        <td style="border:1px solid ${MOSS_PANEL};border-radius:12px;padding:${SPACE.md}px ${SPACE.lg}px;">
          <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:${SIGNAL_WHITE};">${p.name}</p>
          <p style="margin:0;font-size:14px;color:${QUIET_GRAY};">
            ${p.signalsThisWeek} signal${p.signalsThisWeek === 1 ? "" : "s"} caught ·
            ${p.repliesSent} repl${p.repliesSent === 1 ? "y" : "ies"} sent ·
            ${p.usersAcquired} user${p.usersAcquired === 1 ? "" : "s"} acquired
          </p>
          ${sections.join("")}
          ${button(p.dashboardUrl, "View dashboard")}
        </td>
      </tr>
    </table>
  `;
}

export function weeklyDigestEmailTemplate({ projects }: { projects: DigestProjectSummary[] }) {
  const totals = projects.reduce(
    (acc, p) => ({
      signals: acc.signals + p.signalsThisWeek,
      replies: acc.replies + p.repliesSent,
    }),
    { signals: 0, replies: 0 }
  );

  return {
    subject: "Your weekly Getrive digest",
    html: wrapper(
      `
    <h1 style="margin:0 0 4px;font-family:${SANS};font-size:22px;font-weight:500;color:${SIGNAL_WHITE};">Your week in review</h1>
    <p style="margin:0;font-size:14px;color:${QUIET_GRAY};">The past 7 days across your projects.</p>
    ${projects.map(projectRow).join("")}
  `,
      "You're getting this because the weekly digest is on in your account settings.",
      `This week: ${totals.signals} signal${totals.signals === 1 ? "" : "s"} caught, ${totals.replies} repl${totals.replies === 1 ? "y" : "ies"} sent.`
    ),
  };
}

// The one-time "your first scan actually found something" email — sent
// exactly once per project (claimed via Product.firstSignalsEmailSentAt in
// lib/reddit/poll.ts), not gated on the notifyNewSignal preference the way
// signalAlertEmailTemplate is: this is the activation nudge that brings a
// founder back after onboarding, not an ongoing notification they can
// reasonably want off.
export function firstSignalsEmailTemplate({
  productName,
  signals,
  dashboardUrl,
}: {
  productName: string;
  signals: DigestSignalItem[];
  dashboardUrl: string;
}) {
  const [firstSignal] = signals;
  const morePreview = signals.length > 1 ? ` +${signals.length - 1} more` : "";

  return {
    subject: `Your first ${productName} signals are ready`,
    html: wrapper(
      `
    <h1 style="margin:0 0 ${SPACE.md}px;font-family:${SANS};font-size:22px;font-weight:500;color:${SIGNAL_WHITE};">Your first signals are in</h1>
    <p style="margin:0;font-size:14px;line-height:1.6;color:${QUIET_GRAY};">
      Getrive just scored its first posts for ${productName} — here's what matched:
    </p>
    ${signals.map(signalRow).join("")}
    ${button(dashboardUrl, "View dashboard")}
  `,
      "You're getting this because it's the first time Getrive found something for this project.",
      firstSignal ? `${firstSignal.title}${morePreview}` : `Your first signals just came in for ${productName}.`
    ),
  };
}
