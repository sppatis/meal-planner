"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteRecipe } from "@/app/actions";
import { ConfirmModal } from "./confirm-modal";

export function DeleteRecipeButton({ slug, name }: { slug: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen(true)}
        className="rounded-lg border border-stone-300 px-3 py-1.5 font-medium text-rose-700 hover:border-rose-600 disabled:opacity-50"
      >
        Delete
      </button>
      <ConfirmModal
        open={open}
        title={`Delete “${name}”?`}
        description="Any nights it's planned for will get another dinner instead."
        confirmLabel="Delete recipe"
        danger
        pending={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          startTransition(async () => {
            await deleteRecipe(slug);
            setOpen(false);
            router.push("/recipes");
          })
        }
      />
    </>
  );
}
