import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, authRequired, cookieOptions, createToken, readToken, RENEW_AFTER_SECONDS } from "@/lib/auth-token";

export async function proxy(request: NextRequest) {
  if (!authRequired()) return NextResponse.next();

  const session = await readToken(request.cookies.get(AUTH_COOKIE)?.value);
  if (session) {
    const response = NextResponse.next();
    if (session.age > RENEW_AFTER_SECONDS) {
      const token = await createToken({ id: session.householdId, sessionVersion: session.version });
      response.cookies.set(AUTH_COOKIE, token, cookieOptions);
    }
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
