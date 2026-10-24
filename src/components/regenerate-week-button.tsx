"use client";

import { useTransition } from "react";
import { regenerateWeek } from "@/app/actions";

export function RegenerateWeekButton({ planId, week }: { planId: string; week: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(`Shuffle all 7 dinners in week ${week + 1}? Any swaps you've made that week will be replaced.`)) {
          startTransition(() => regenerateWeek(planId, week));
        }
      }}
      className="no-print rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-white disabled:opacity-50"
    >
      {pending ? "Shuffling..." : "Shuffle week"}
    </button>
  );
}
