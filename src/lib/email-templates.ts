// Inline-styled HTML emails (no external CSS — most inboxes strip <style>
// blocks anyway). Colors are a neutral placeholder; update these to match the
// Auth pages' AIDesigner palette once that's generated.
const INK = "#111827";
const PAPER = "#F9FAFB";
const MUTED = "#6B7280";
const BORDER = "#E5E7EB";

function wrapper(bodyHtml: string, footer: string): string {
  return `
    <div style="background:${PAPER};padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
      <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid ${BORDER};">
        <p style="margin:0 0 24px;font-weight:700;font-size:18px;color:${INK};">Getrive</p>
        ${bodyHtml}
        <p style="margin:32px 0 0;font-size:12px;color:${MUTED};">
          ${footer}
        </p>
      </div>
    </div>
  `;
}

function button(url: string, label: string): string {
  return `
    <a href="${url}" style="display:inline-block;margin-top:20px;padding:14px 24px;background:${INK};color:#ffffff;font-weight:700;text-decoration:none;border-radius:9999px;">
      ${label}
    </a>
  `;
}

export function verificationEmailTemplate({ verifyUrl }: { verifyUrl: string }) {
  return {
    subject: "Verify your Getrive email",
    html: wrapper(
      `
    <h1 style="margin:0 0 12px;font-size:22px;color:${INK};">Confirm your email</h1>
    <p style="margin:0;font-size:14px;color:${INK};">Click below to verify your email address and finish setting up your Getrive account.</p>
    ${button(verifyUrl, "Verify email")}
    <p style="margin:20px 0 0;font-size:12px;color:${MUTED};">This link expires in 24 hours.</p>
  `,
      "If you didn't create an Getrive account, you can safely ignore this email."
    ),
  };
}

export function passwordResetEmailTemplate({ resetUrl }: { resetUrl: string }) {
  return {
    subject: "Reset your Getrive password",
    html: wrapper(
      `
    <h1 style="margin:0 0 12px;font-size:22px;color:${INK};">Reset your password</h1>
    <p style="margin:0;font-size:14px;color:${INK};">Click below to choose a new password for your Getrive account.</p>
    ${button(resetUrl, "Reset password")}
    <p style="margin:20px 0 0;font-size:12px;color:${MUTED};">This link expires in 1 hour.</p>
  `,
      "If you didn't request a password reset, you can safely ignore this email."
    ),
  };
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
    <h1 style="margin:0 0 12px;font-size:22px;color:${INK};">New signal found</h1>
    <p style="margin:0 0 16px;font-size:14px;color:${MUTED};">${sourceLabel} · ${productName}</p>
    <p style="margin:0;font-size:16px;font-weight:600;color:${INK};">${title}</p>
    <p style="margin:8px 0 0;font-size:14px;color:${MUTED};">${snippet}</p>
    ${button(signalUrl, "View signal")}
  `,
      "You're getting this because instant signal alerts are on in your account settings."
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
  return `
    <a href="${signal.url}" style="display:block;margin-top:10px;text-decoration:none;">
      <p style="margin:0;font-size:14px;font-weight:600;color:${INK};">${signal.title}</p>
      <p style="margin:2px 0 0;font-size:12px;color:${MUTED};">
        ${signal.sourceLabel} · ${Math.round(signal.relevanceScore * 100)}% match
      </p>
    </a>
  `;
}

// One project's "needs your attention" block — built only from sections
// that actually have content, so a project with e.g. no outreach drafts
// simply omits that sub-section rather than showing an empty heading.
function projectRow(p: DigestProjectSummary): string {
  const sections: string[] = [];

  if (p.unrepliedSignals.length > 0) {
    const more =
      p.unrepliedSignalsTotal > p.unrepliedSignals.length
        ? `<p style="margin:8px 0 0;font-size:12px;color:${MUTED};">+${p.unrepliedSignalsTotal - p.unrepliedSignals.length} more waiting</p>`
        : "";
    sections.push(`
      <div style="margin-top:16px;">
        <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.04em;color:${MUTED};text-transform:uppercase;">Unreplied signals</p>
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
      <div style="margin-top:16px;">
        <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.04em;color:${MUTED};text-transform:uppercase;">Drafted, not sent</p>
        <p style="margin:6px 0 0;font-size:14px;color:${INK};">${p.unsentOutreach.map((o) => o.name).join(", ")}${more}</p>
      </div>
    `);
  }

  return `
    <div style="margin-top:20px;padding-top:20px;border-top:1px solid ${BORDER};">
      <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:${INK};">${p.name}</p>
      <p style="margin:0;font-size:14px;color:${MUTED};">
        ${p.signalsThisWeek} signal${p.signalsThisWeek === 1 ? "" : "s"} caught ·
        ${p.repliesSent} repl${p.repliesSent === 1 ? "y" : "ies"} sent ·
        ${p.usersAcquired} user${p.usersAcquired === 1 ? "" : "s"} acquired
      </p>
      ${sections.join("")}
      ${button(p.dashboardUrl, "View dashboard")}
    </div>
  `;
}

export function weeklyDigestEmailTemplate({ projects }: { projects: DigestProjectSummary[] }) {
  return {
    subject: "Your weekly Getrive digest",
    html: wrapper(
      `
    <h1 style="margin:0 0 4px;font-size:22px;color:${INK};">Your week in review</h1>
    <p style="margin:0;font-size:14px;color:${MUTED};">The past 7 days across your projects.</p>
    ${projects.map(projectRow).join("")}
  `,
      "You're getting this because the weekly digest is on in your account settings."
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
  return {
    subject: `Your first ${productName} signals are ready`,
    html: wrapper(
      `
    <h1 style="margin:0 0 12px;font-size:22px;color:${INK};">Your first signals are in</h1>
    <p style="margin:0 0 16px;font-size:14px;color:${MUTED};">
      Getrive just scored its first posts for ${productName} — here's what matched:
    </p>
    ${signals.map(signalRow).join("")}
    ${button(dashboardUrl, "View dashboard")}
  `,
      "You're getting this because it's the first time Getrive found something for this project."
    ),
  };
}
