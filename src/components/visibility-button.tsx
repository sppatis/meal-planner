"use client";

import { useOptimistic, useTransition } from "react";
import { setRecipeHidden } from "@/app/actions";

function EyeOpen({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOff({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <path d="M3 3l18 18" strokeLinecap="round" />
      <path
        d="M10.6 10.6a3 3 0 0 0 4.2 4.2M9.9 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.3 17.3 0 0 1-3.2 4.4M6.1 6.1A17.5 17.5 0 0 0 2 12s3.5 7 10 7a10.4 10.4 0 0 0 4.4-1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface Props {
  recipeSlug: string;
  /** True when this household has turned the recipe off for planning. */
  hidden: boolean;
  /** Show the "Included / Hidden" label next to the icon. */
  labelled?: boolean;
  className?: string;
}

/** Eye toggle: open means the recipe can be planned; closed means this household leaves it out. */
export function VisibilityButton({ recipeSlug, hidden, labelled = false, className = "" }: Props) {
  const [optimisticHidden, setOptimisticHidden] = useOptimistic(hidden);
  const [, startTransition] = useTransition();
  const included = !optimisticHidden;

  return (
    <button
      type="button"
      aria-pressed={included}
      aria-label={included ? "Included in plans" : "Hidden from plans"}
      title={included ? "Included in plans — tap to hide" : "Hidden from plans — tap to include"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        startTransition(async () => {
          setOptimisticHidden(!optimisticHidden);
          await setRecipeHidden(recipeSlug, !optimisticHidden);
        });
      }}
      className={`${
        labelled
          ? `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition ${
              included
                ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                : "bg-stone-100 text-stone-500 ring-stone-200"
            }`
          : `rounded-full p-1.5 shadow-sm ring-1 backdrop-blur transition ${
              included
                ? "bg-white/90 text-emerald-700 ring-emerald-200 hover:bg-white"
                : "bg-stone-900/70 text-stone-200 ring-stone-700 hover:bg-stone-900/80"
            }`
      } ${className}`}
    >
      {included ? <EyeOpen className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      {labelled && <span>{included ? "In plans" : "Hidden"}</span>}
    </button>
  );
}
