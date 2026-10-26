import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, authConfigProblem, isValidToken, safeNext } from "@/lib/auth-token";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeNext((await searchParams).next);
  const problem = authConfigProblem();
  if (!problem && (await isValidToken((await cookies()).get(AUTH_COOKIE)?.value))) redirect(next);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-sm ring-1 ring-stone-200">
        <h1 className="text-2xl font-bold text-stone-900">Dinner Planner</h1>
        {problem ? (
          <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200" role="alert">
            <p className="font-semibold">Sign-in isn&apos;t set up yet</p>
            <p className="mt-1">{problem} Update the server&apos;s environment and restart it.</p>
          </div>
        ) : (
          <>
            <p className="mt-2 mb-6 text-sm text-stone-600">
              Enter the household passcode to see this week&apos;s dinners.
            </p>
            <LoginForm next={next} />
          </>
        )}
      </div>
    </main>
  );
}
