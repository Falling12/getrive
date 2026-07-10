// Shared by every raw-post fetcher (Reddit's RSS <content>, Hacker News's
// `text` field) that needs to turn a snippet of basic HTML into plain text
// for scoring/display — both sources produce similarly light markup
// (paragraphs, links, escaped entities), so one small implementation covers
// both rather than duplicating it per fetcher.
export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function stripHtmlToText(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}
