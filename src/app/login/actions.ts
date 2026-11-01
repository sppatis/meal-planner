"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, cookieOptions, createToken, safeNext } from "@/lib/auth-token";
import { signInProblem } from "@/lib/household";
import { failureDelay, lockedFor, recordFailure, recordSuccess } from "@/lib/login-limiter";
import { matchHousehold } from "@/lib/passcode";
import { store } from "@/lib/store";

// Behind a reverse proxy, X-Real-IP and the last X-Forwarded-For entry are set by the proxy; earlier entries come from the client.
async function clientId() {
  const h = await headers();
  return h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "unknown";
}

export async function login(_prev: string | null, formData: FormData): Promise<string | null> {
  const problem = await signInProblem();
  if (problem) return `Sign-in isn't set up yet: ${problem}`;

  const client = await clientId();
  const wait = lockedFor(client);
  if (wait) return `Too many wrong tries. Try again in ${Math.ceil(wait / 60_000)} minutes.`;

  const passcode = String(formData.get("passcode") ?? "").trim();
  const household = await matchHousehold(passcode, await store.listHouseholds());
  if (!household) {
    recordFailure(client);
    await new Promise((r) => setTimeout(r, failureDelay()));
    return "That passcode didn't match. Try again.";
  }

  recordSuccess(client);
  (await cookies()).set(AUTH_COOKIE, await createToken(household), cookieOptions);
  redirect(safeNext(formData.get("next")));
}

export async function logout() {
  (await cookies()).delete(AUTH_COOKIE);
  redirect("/login");
}
