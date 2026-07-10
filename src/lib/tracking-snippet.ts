// Two tiny, dependency-free snippets a founder pastes into their own site.
// Together they close the loop Getrive can't close on its own: Getrive can
// tag a link with which subreddit/reply it came from (utm_content = a
// TrackedLink id), but only the founder's own site knows when that visitor
// actually signs up. The capture snippet remembers the attribution across
// the visit; the report snippet (added only to the signup/welcome page)
// tells Getrive it happened.

export function buildCaptureSnippet(): string {
  return `<script>
(function () {
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
})();
</script>`;
}

export function buildReportSnippet(appUrl: string): string {
  return `<script>
(function () {
  var KEY = 'getrive_attr';
  var stored;
  try { stored = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  if (!stored || !stored.l || !stored.t) return;
  fetch('${appUrl}/api/track/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trackedLinkId: stored.l, visitorToken: stored.t }),
    keepalive: true,
  });
  localStorage.removeItem(KEY);
})();
</script>`;
}
