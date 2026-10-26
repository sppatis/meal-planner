"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {/* Lets password managers save the passcode against a fixed name. */}
      <input type="text" name="username" value="household" autoComplete="username" readOnly hidden />
      <label className="block">
        <span className="text-sm font-medium text-stone-700">Household passcode</span>
        <input
          name="passcode"
          type="password"
          autoFocus
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-lg outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        />
      </label>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button
        disabled={pending}
        className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? "Checking..." : "Let's eat"}
      </button>
    </form>
  );
}
