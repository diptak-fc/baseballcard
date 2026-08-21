import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE, homeForRole } from "@/lib/auth";

const PROTECTED: { prefix: string; roles: string[] }[] = [
  { prefix: "/admin", roles: ["ADMIN"] },
  { prefix: "/ceo", roles: ["CEO"] },
  { prefix: "/me", roles: ["CSM"] },
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const rule = PROTECTED.find((r) => pathname.startsWith(r.prefix));
  if (!rule) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (!rule.roles.includes(session.role)) {
    const url = req.nextUrl.clone();
    url.pathname = homeForRole(session.role);
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/ceo/:path*", "/me/:path*"],
};
