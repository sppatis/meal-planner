"use server";

import { createHash, timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, authConfigProblem, cookieOptions, createToken, safeNext } from "@/lib/auth-token";
import { failureDelay, lockedFor, recordFailure, recordSuccess } from "@/lib/login-limiter";

const digest = (s: string) => createHash("sha256").update(s).digest();

// Behind a reverse proxy, X-Real-IP and the last X-Forwarded-For entry are set by the proxy; earlier entries come from the client.
async function clientId() {
  const h = await headers();
  return h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "unknown";
}

export async function login(_prev: string | null, formData: FormData): Promise<string | null> {
  const problem = authConfigProblem();
  if (problem) return `Sign-in isn't set up yet: ${problem}`;

  const client = await clientId();
  const wait = lockedFor(client);
  if (wait) return `Too many wrong tries. Try again in ${Math.ceil(wait / 60_000)} minutes.`;

  const passcode = String(formData.get("passcode") ?? "").trim();
  if (!timingSafeEqual(digest(passcode), digest(process.env.HOUSEHOLD_PASSCODE ?? ""))) {
    recordFailure(client);
    await new Promise((r) => setTimeout(r, failureDelay()));
    return "That passcode didn't match. Try again.";
  }

  recordSuccess(client);
  (await cookies()).set(AUTH_COOKIE, await createToken(), cookieOptions);
  redirect(safeNext(formData.get("next")));
}

export async function logout() {
  (await cookies()).delete(AUTH_COOKIE);
  redirect("/login");
}
