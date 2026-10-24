"use client";

import { useTransition } from "react";
import { deletePlan } from "@/app/actions";

export function DeletePlanButton({ planId, title }: { planId: string; title: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(`Delete "${title}" and all of its dinners? Ratings, photos and your recipes are kept.`)) {
          startTransition(() => deletePlan(planId));
        }
      }}
      className="rounded-lg px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
    >
      {pending ? "Deleting..." : "Delete"}
    </button>
  );
}
