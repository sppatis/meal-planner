"use client";

import { useState, useTransition } from "react";
import { setSlotSkipped } from "@/app/actions";

/** Toggle beside Replace. Skipping keeps the dinner on the day and drops it from the shopping list. */
export function SkipButton({ planId, date, skipped }: { planId: string; date: string; skipped: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const label = pending ? "Saving…" : skipped ? "Unskip" : "Skip";

  function toggle() {
    setError(null);
    startTransition(async () => {
      try {
        await setSlotSkipped(planId, date, !skipped);
      } catch {
        setError(skipped ? "Couldn't put that dinner back on the list." : "Couldn't skip that dinner.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        aria-pressed={skipped}
        aria-label={
          skipped
            ? "Put this dinner back on the shopping list"
            : "Skip this dinner. It stays on the day and leaves the shopping list"
        }
        title={error ?? (skipped ? "Put this dinner back on the shopping list" : "Leave this dinner off the shopping list")}
        disabled={pending}
        onClick={toggle}
        className={`no-print rounded-lg border px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
          error
            ? "border-rose-300 bg-rose-50 text-rose-800"
            : skipped
              ? "border-amber-300 bg-amber-50 text-amber-950 hover:border-emerald-600 hover:bg-white hover:text-emerald-800"
              : "border-stone-200 text-stone-600 hover:border-amber-600 hover:text-amber-900"
        }`}
      >
        {error ? "Try again" : label}
      </button>
      {error && (
        <span role="alert" className="sr-only">
          {error}
        </span>
      )}
    </>
  );
}
