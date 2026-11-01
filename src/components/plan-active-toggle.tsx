"use client";

import { useTransition } from "react";
import { setActivePlan } from "@/app/actions";

/** Switch that makes this plan the homepage plan, or clears the active plan when turned off. */
export function PlanActiveToggle({ planId, active }: { planId: string; active: boolean }) {
  const [pending, startTransition] = useTransition();
  const id = `active-${planId}`;
  return (
    <label
      htmlFor={id}
      className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium ${
        active ? "text-emerald-800" : "text-stone-600"
      } ${pending ? "opacity-50" : ""}`}
    >
      <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
        <input
          id={id}
          type="checkbox"
          role="switch"
          className="peer sr-only"
          checked={active}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.checked;
            startTransition(async () => {
              await setActivePlan(next ? planId : null);
            });
          }}
        />
        <span className="h-5 w-9 rounded-full bg-stone-300 transition peer-checked:bg-emerald-600 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-700" />
        <span className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
      </span>
      {active ? "Active" : "Inactive"}
    </label>
  );
}
