import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, authRequired, cookieOptions, createToken, RENEW_AFTER_SECONDS, tokenAge } from "@/lib/auth-token";

export async function proxy(request: NextRequest) {
  if (!authRequired()) return NextResponse.next();

  const age = await tokenAge(request.cookies.get(AUTH_COOKIE)?.value);
  if (age !== null) {
    const response = NextResponse.next();
    if (age > RENEW_AFTER_SECONDS) response.cookies.set(AUTH_COOKIE, await createToken(), cookieOptions);
    return response;
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/((?!login|share|api/photos|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|robots.txt).*)",
  ],
};
