import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Remembers the Home feed's last-selected status filter across visits.
// The sidebar/mobile-nav links to /home with no query string at all, so
// without this every visit reset back to "All" and the founder had to
// re-select "Not replied" every single time — see home/page.tsx, which
// falls back to this cookie only when the incoming URL itself carries no
// `status` param (a bare nav-link click, not an explicit filter choice).
// A plain per-request cookie write here, rather than converting the filter
// pills (SignalFilterBar) into client components that call a Server
// Action, keeps them as plain, prefetchable <Link>s — no client JS needed
// just to remember a filter.
const SIGNALS_STATUS_COOKIE = "signals-status";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function proxy(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status");
  if (!status) return NextResponse.next();

  const response = NextResponse.next();
  response.cookies.set(SIGNALS_STATUS_COOKIE, status, {
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
  });
  return response;
}

export const config = {
  matcher: "/projects/:projectId/home",
};
