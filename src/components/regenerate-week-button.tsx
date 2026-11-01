"use client";

import { useState, useTransition } from "react";
import { regenerateWeek } from "@/app/actions";
import { ConfirmModal } from "./confirm-modal";

export function RegenerateWeekButton({ planId, week }: { planId: string; week: number }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen(true)}
        className="no-print rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-white disabled:opacity-50"
      >
        {pending ? "Shuffling..." : "Shuffle week"}
      </button>
      <ConfirmModal
        open={open}
        title={`Shuffle week ${week + 1}?`}
        description="All 7 dinners that week are replaced. Any swaps you've made that week will be lost."
        confirmLabel="Shuffle week"
        pending={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          startTransition(async () => {
            await regenerateWeek(planId, week);
            setOpen(false);
          })
        }
      />
    </>
  );
}