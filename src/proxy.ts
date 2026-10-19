import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, isValidToken } from "@/lib/auth-token";

export async function proxy(request: NextRequest) {
  if (await isValidToken(request.cookies.get(AUTH_COOKIE)?.value)) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/((?!login|share|api/photos|_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)",
  ],
};
