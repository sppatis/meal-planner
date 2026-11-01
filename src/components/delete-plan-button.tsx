"use client";

import { useState, useTransition } from "react";
import { deletePlan } from "@/app/actions";
import { ConfirmModal } from "./confirm-modal";

export function DeletePlanButton({ planId, title }: { planId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen(true)}
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
      >
        Delete
      </button>
      <ConfirmModal
        open={open}
        title={`Delete “${title}”?`}
        description="This removes the plan and all of its dinners. Ratings, photos and your recipes are kept."
        confirmLabel="Delete plan"
        danger
        pending={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          startTransition(async () => {
            await deletePlan(planId);
            setOpen(false);
          })
        }
      />
    </>
  );
}
