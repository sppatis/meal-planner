"use client";

import { useState, useTransition } from "react";
import { deleteInactivePlans } from "@/app/actions";
import { ConfirmModal } from "./confirm-modal";

export function DeleteInactivePlansButton({ count }: { count: number }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  if (count < 1) return null;
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen(true)}
        className="rounded-xl px-4 py-2.5 text-sm font-semibold text-rose-800 ring-1 ring-rose-200 hover:bg-rose-50 disabled:opacity-50"
      >
        Delete {count} inactive {count === 1 ? "plan" : "plans"}
      </button>
      <ConfirmModal
        open={open}
        title={count === 1 ? "Delete the inactive plan?" : `Delete ${count} inactive plans?`}
        description="Only the active plan is kept. Ratings, photos and your recipes are not affected."
        confirmLabel={count === 1 ? "Delete inactive plan" : "Delete inactive plans"}
        danger
        pending={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          startTransition(async () => {
            await deleteInactivePlans();
            setOpen(false);
          })
        }
      />
    </>
  );
}
