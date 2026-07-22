import { assertPublicHttpUrl } from "@/lib/scraping/url-safety";

// Spoofed browser UA — same pragmatic reasoning as lib/reddit/fetch-posts.ts:
// plenty of sites block non-browser User-Agents outright.
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 8_000;
const MAX_RESPONSE_BYTES = 2_000_000; // plenty for a marketing page's HTML
const MAX_REDIRECTS = 5;
const MAX_TEXT_CHARS = 6_000; // enough context for the AI extraction call, capped for cost

export class PageFetchError extends Error {}

async function readWithCap(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return response.text();

  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf-8");
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

const TITLE_RE = /<title[^>]*>([\s\S]*?)<\/title>/i;
const META_DESCRIPTION_RE = /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i;

function extractTextFromHtml(html: string): { title: string; text: string } {
  const title = decodeHtmlEntities(TITLE_RE.exec(html)?.[1]?.trim() ?? "");
  const metaDescription = decodeHtmlEntities(META_DESCRIPTION_RE.exec(html)?.[1]?.trim() ?? "");

  const withoutNonContent = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const bodyText = decodeHtmlEntities(withoutNonContent.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

  const text = [metaDescription, bodyText].filter(Boolean).join("\n").slice(0, MAX_TEXT_CHARS);
  return { title, text };
}

// Fetches a founder-supplied URL's raw HTML — shared by fetchPageText below
// (onboarding/settings prefill) and the tracking-snippet install check
// (settings/actions.ts's checkSnippetInstallationAction), which needs the
// unstripped markup since extractTextFromHtml below deliberately discards
// <script> contents. Redirects are followed manually (not via fetch's
// `redirect: "follow"`) so every hop — not just the original URL — gets
// re-validated by assertPublicHttpUrl before being dialed; that's what
// closes off redirect-based SSRF bypasses.
export async function fetchRawHtml(rawUrl: string): Promise<{ html: string; finalUrl: string }> {
  let currentUrl = await assertPublicHttpUrl(rawUrl);

  for (let redirects = 0; ; redirects++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(currentUrl, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
        redirect: "manual",
        signal: controller.signal,
      });
    } catch (error) {
      throw new PageFetchError(
        error instanceof Error && error.name === "AbortError"
          ? "That page took too long to respond."
          : "Couldn't reach that URL."
      );
    } finally {
      clearTimeout(timeout);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new PageFetchError("Got a redirect with no destination.");
      if (redirects >= MAX_REDIRECTS) throw new PageFetchError("Too many redirects.");
      currentUrl = await assertPublicHttpUrl(new URL(location, currentUrl).toString());
      continue;
    }

    if (!response.ok) {
      throw new PageFetchError(`That page returned HTTP ${response.status}.`);
    }

    const html = await readWithCap(response, MAX_RESPONSE_BYTES);
    return { html, finalUrl: currentUrl.toString() };
  }
}

// Fetches a founder-supplied marketing/product URL for onboarding prefill.
export async function fetchPageText(rawUrl: string): Promise<{ title: string; text: string }> {
  const { html } = await fetchRawHtml(rawUrl);
  return extractTextFromHtml(html);
}
