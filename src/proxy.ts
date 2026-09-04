import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "rf_session";
const PROTECTED = ["/dashboard", "/resume", "/settings", "/onboarding"];
const AUTH_PAGES = ["/login", "/register", "/forgot-password"];

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = !!req.cookies.get(SESSION_COOKIE)?.value;
  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/")) && !hasSession) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (AUTH_PAGES.includes(pathname) && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  const res = NextResponse.next();
  if (PROTECTED.some((p) => pathname.startsWith(p))) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|svg|ico)).*)"],
};
