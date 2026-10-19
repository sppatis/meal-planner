import "server-only";
import { cookies } from "next/headers";
import { AUTH_COOKIE, isValidToken } from "./auth-token";

export async function requireAuth() {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!(await isValidToken(token))) throw new Error("Unauthorised");
}
