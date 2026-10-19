"use client";

import { useOptimistic, useTransition } from "react";
import { setFavourite } from "@/app/actions";

export function FavouriteButton({ recipeSlug, favourite }: { recipeSlug: string; favourite: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(favourite);
  const [, startTransition] = useTransition();
  return (
    <button
      type="button"
      aria-pressed={optimistic}
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic);
          await setFavourite(recipeSlug, !optimistic);
        })
      }
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition ${
        optimistic ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-white text-stone-600 ring-stone-200 hover:ring-rose-300"
      }`}
    >
      <span aria-hidden>{optimistic ? "♥" : "♡"}</span>
      {optimistic ? "Favourite" : "Add to favourites"}
    </button>
  );
}
