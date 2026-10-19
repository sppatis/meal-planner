"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, expectedToken } from "@/lib/auth-token";

export async function login(_prev: string | null, formData: FormData): Promise<string | null> {
  const passcode = String(formData.get("passcode") ?? "").trim();
  const next = String(formData.get("next") ?? "/");
  if (!process.env.HOUSEHOLD_PASSCODE || passcode !== process.env.HOUSEHOLD_PASSCODE) {
    return "That passcode didn't match. Try again.";
  }
  (await cookies()).set(AUTH_COOKIE, await expectedToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}
