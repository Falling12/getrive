import { prisma } from "@/lib/prisma";

// Zero-code alternative to the JS snippet: the founder pastes this URL into
// their signup tool's existing "redirect after signup" / "success URL"
// field (a plain config value most signup tools, forms, and checkout
// providers already expose — no code to write). When a signup completes,
// their tool redirects the browser here; we log an (unattributed) signup and
// bounce the visitor on to their real thank-you page.
//
// Tradeoff vs the snippet: since nothing captured which reply/subreddit this
// visitor originally clicked from, this can only report "a signup happened"
// in aggregate — it can't attribute to a specific TrackedLink. Founders who
// want the per-subreddit breakdown still need the snippet.
//
// `next` is restricted to the same origin as the product's registered
// website URL, so this can't be used as an open redirector to an arbitrary
// domain — misconfigured/malicious `next` values fall back to the product's
// own site root instead of erroring out on a real visitor mid-signup.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");
  const nextParam = url.searchParams.get("next");

  if (!productId) {
    return new Response("Missing productId", { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, websiteUrl: true },
  });
  if (!product?.websiteUrl) {
    return new Response("Unknown project", { status: 404 });
  }

  const siteOrigin = new URL(product.websiteUrl).origin;
  let destination = product.websiteUrl;
  if (nextParam) {
    try {
      const nextUrl = new URL(nextParam);
      if (nextUrl.origin === siteOrigin) destination = nextUrl.toString();
    } catch {
      // Invalid `next` — fall through to the site root fallback above.
    }
  }

  await prisma.signup.create({
    data: {
      productId: product.id,
      source: "AUTOMATIC",
      note: "Auto-tracked via signup redirect (not attributed to a specific reply)",
    },
  });

  return Response.redirect(destination, 302);
}
