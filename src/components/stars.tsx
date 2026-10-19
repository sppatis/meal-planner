"use client";

import { useOptimistic, useTransition } from "react";
import { setRating } from "@/app/actions";

function Star({ filled, className = "" }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={`${className} ${filled ? "fill-amber-400" : "fill-stone-200"}`}>
      <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z" />
    </svg>
  );
}

export function StarDisplay({ value, size = "h-4 w-4" }: { value?: number; size?: string }) {
  if (!value) return <span className="text-xs text-stone-400">Not rated yet</span>;
  return (
    <span className="inline-flex" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={n <= value} className={size} />
      ))}
    </span>
  );
}

export function StarRating({ recipeSlug, value }: { recipeSlug: string; value?: number }) {
  const [optimistic, setOptimistic] = useOptimistic(value ?? 0);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <div className="flex" role="radiogroup" aria-label="Rate this recipe">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={optimistic === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() =>
              startTransition(async () => {
                setOptimistic(n);
                await setRating(recipeSlug, n);
              })
            }
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star filled={n <= optimistic} className="h-8 w-8" />
          </button>
        ))}
      </div>
      <span className="text-sm text-stone-500">
        {pending ? "Saving..." : optimistic ? `${optimistic}/5` : "Tap to rate"}
      </span>
    </div>
  );
}
