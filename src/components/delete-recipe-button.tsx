"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteRecipe } from "@/app/actions";

export function DeleteRecipeButton({ slug, name }: { slug: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(`Delete "${name}"? Any nights it's planned for will get another dinner instead.`)) {
          startTransition(async () => {
            await deleteRecipe(slug);
            router.push("/recipes");
          });
        }
      }}
      className="rounded-lg border border-stone-300 px-3 py-1.5 font-medium text-rose-700 hover:border-rose-600 disabled:opacity-50"
    >
      {pending ? "Deleting..." : "Delete"}
    </button>
  );
}
