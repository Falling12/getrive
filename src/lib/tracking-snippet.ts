// Two tiny, dependency-free snippets a founder pastes into their own site.
// Together they close the loop Getrive can't close on its own: Getrive can
// tag a link with which subreddit/reply it came from (utm_content = a
// TrackedLink id), but only the founder's own site knows when that visitor
// actually signs up. The capture snippet remembers the attribution across
// the visit; the report snippet (added only to the signup/welcome page)
// tells Getrive it happened.
//
// The raw (unwrapped) bodies are exported separately from the founder-facing
// build*Snippet() functions below so Getrive can inject the exact same logic
// natively into its own pages (see app/layout.tsx and
// app/onboarding/layout.tsx) via <script dangerouslySetInnerHTML>, without
// nesting a literal "<script>" string inside a React <script> element's
// content — the browser would treat that inner "</script>" as a closing tag
// and truncate the code.

const CAPTURE_SNIPPET_BODY = `(function () {
  var params = new URLSearchParams(window.location.search);
  var linkId = params.get('utm_content');
  if (!linkId) return;
  var KEY = 'getrive_attr';
  try {
    var existing = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (existing && existing.l === linkId) return;
  } catch (e) {}
  var token = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now() + '-' + Math.random());
  localStorage.setItem(KEY, JSON.stringify({ l: linkId, t: token }));
})();`;

function reportSnippetBody(): string {
  return `(function () {
    var KEY = 'getrive_attr';
    var stored;

    try {
      stored = JSON.parse(localStorage.getItem(KEY) || 'null');
    } catch (_) {
      return;
    }

    if (!stored || !stored.l || !stored.t) return;

    void fetch(window.location.origin + '/api/track/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackedLinkId: stored.l,
        visitorToken: stored.t,
      }),
      keepalive: true,
    })
      .then(function (response) {
        if (response.ok) {
          localStorage.removeItem(KEY);
        }
      })
      .catch(function () {
        // Ignore network failures.
      });
  })();`;
}

// Raw JS, no wrapping <script> tags — for injecting directly into this
// app's own pages.
export function captureSnippetBody(): string {
  return CAPTURE_SNIPPET_BODY;
}

// Same logic as CAPTURE_SNIPPET_BODY above, as a real TS function instead
// of a string — used by components/analytics/attribution-capture.tsx,
// which (unlike the founder-facing snippet or Getrive's own pre-Cookiebot
// beforeInteractive script) runs after hydration, gated on Cookiebot
// marketing consent. Kept as a separate implementation rather than
// stringifying this at runtime: CAPTURE_SNIPPET_BODY has to stay a plain,
// dependency-free JS string a founder can paste onto any (non-React) site,
// so it can't be generated from this.
export function runCaptureNatively(): void {
  const params = new URLSearchParams(window.location.search);
  const linkId = params.get("utm_content");
  if (!linkId) return;
  const KEY = "getrive_attr";
  try {
    const existing = JSON.parse(localStorage.getItem(KEY) || "null");
    if (existing && existing.l === linkId) return;
  } catch {
    // Ignore malformed localStorage content.
  }
  const token =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
  localStorage.setItem(KEY, JSON.stringify({ l: linkId, t: token }));
}

export function reportSnippetBodyFor(appUrl: string): string {
  return reportSnippetBody();
}

// Full <script>...</script> markup for founders to copy-paste onto their
// own (non-React) site — see TrackingSnippetCard / project settings.
export function buildCaptureSnippet(): string {
  return `<script>\n${CAPTURE_SNIPPET_BODY}\n</script>`;
}

export function buildReportSnippet(appUrl: string): string {
  return `<script>\n${reportSnippetBody()}\n</script>`;
}
