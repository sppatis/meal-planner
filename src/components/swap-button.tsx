"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { replaceSlot } from "@/app/actions";
import { QUICK_MAX_MINS, ROLE_LABELS } from "@/lib/constants";
import { gbp, weekCost, type PriceOverrides } from "@/lib/cost";
import { planLibrary } from "@/lib/exclusions";
import { fitsSlot, isQuickNight } from "@/lib/generator";
import { nutritionPerServing, totalMins } from "@/lib/nutrition";
import type { SlotRole } from "@/lib/types";
import { useLibrary } from "./library-provider";
import { StarDisplay } from "./stars";

interface Props {
  planId: string;
  budget: number;
  excluded: string[];
  quickDays: number[];
  date: string;
  dayLabel: string;
  role: SlotRole;
  currentSlug: string;
  weekSlugs: string[];
  favourites: string[];
  ratings: Record<string, number>;
  prices: PriceOverrides;
}

export function SwapButton(props: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [showAll, setShowAll] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const { planId, budget, excluded, quickDays, date, role, currentSlug, weekSlugs, favourites, ratings, prices } = props;
  const fullLibrary = useLibrary();
  const library = useMemo(() => planLibrary(fullLibrary, { excluded }), [fullLibrary, excluded]);

  const options = useMemo(() => {
    const cost = (slugs: string[]) =>
      weekCost(slugs.map((s) => fullLibrary.bySlug[s]).filter(Boolean), prices, library.ingredients);
    const currentCost = cost(weekSlugs);
    const fav = new Set(favourites);
    const inWeek = new Set(weekSlugs);
    return library.recipes.filter((r) => fitsSlot(r, role, date, quickDays) && !inWeek.has(r.slug))
      .map((r) => {
        const newSlugs = weekSlugs.map((s) => (s === currentSlug ? r.slug : s));
        const newCost = cost(newSlugs);
        return { recipe: r, favourite: fav.has(r.slug), newCost, delta: newCost - currentCost };
      })
      .sort((a, b) => (ratings[b.recipe.slug] ?? 0) - (ratings[a.recipe.slug] ?? 0) || a.delta - b.delta);
  }, [date, quickDays, role, currentSlug, weekSlugs, favourites, ratings, prices, library, fullLibrary]);

  const favouriteOptions = options.filter((o) => o.favourite);
  const shown = showAll ? options : favouriteOptions;

  function choose(slug: string) {
    setError(null);
    startTransition(async () => {
      try {
        await replaceSlot(planId, date, slug);
        dialog.current?.close();
      } catch {
        setError("Couldn't swap that meal. Please try again.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setShowAll(favouriteOptions.length === 0);
          dialog.current?.showModal();
        }}
        className="no-print rounded-lg border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-600 hover:border-emerald-600 hover:text-emerald-700"
      >
        Replace
      </button>
      <dialog
        ref={dialog}
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="m-auto w-[min(36rem,calc(100vw-2rem))] rounded-2xl p-0 shadow-xl backdrop:bg-stone-900/40"
      >
        <div className="border-b border-stone-200 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Replace {props.dayLabel}&apos;s dinner</h2>
              <p className="mt-1 text-sm text-stone-600">
                Showing {ROLE_LABELS[role].toLowerCase()} options
                {isQuickNight(date, quickDays) ? ` ready in ${QUICK_MAX_MINS} minutes or less` : ""}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="rounded-lg px-2 py-1 text-stone-500 hover:bg-stone-100"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="mt-4 inline-flex rounded-lg bg-stone-100 p-1 text-sm">
            <button
              type="button"
              onClick={() => setShowAll(false)}
              className={`rounded-md px-3 py-1 ${!showAll ? "bg-white shadow-sm" : "text-stone-600"}`}
            >
              Favourites ({favouriteOptions.length})
            </button>
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className={`rounded-md px-3 py-1 ${showAll ? "bg-white shadow-sm" : "text-stone-600"}`}
            >
              All matching ({options.length})
            </button>
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-3">
          {shown.length === 0 && (
            <p className="p-4 text-sm text-stone-600">
              No favourites fit this slot yet. Rate dinners 4 stars or more, or tap the heart on a recipe, and they&apos;ll
              show up here.
            </p>
          )}
          <ul className="space-y-1">
            {shown.map(({ recipe, favourite, newCost, delta }) => {
              const n = nutritionPerServing(recipe, library.ingredients);
              const over = newCost > budget;
              return (
                <li key={recipe.slug}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => choose(recipe.slug)}
                    className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-emerald-50 disabled:opacity-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {favourite && <span className="mr-1 text-rose-500">♥</span>}
                        {recipe.name}
                        {recipe.custom && (
                          <span className="ml-1.5 rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800">
                            Ours
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-stone-500">
                        <span>{n.kcal} kcal</span>
                        <span>{totalMins(recipe)} min</span>
                        <StarDisplay value={ratings[recipe.slug]} size="h-3 w-3" />
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <p className={delta > 0 ? "text-rose-700" : "text-emerald-700"}>
                        {delta >= 0 ? "+" : "-"}
                        {gbp(Math.abs(delta))}
                      </p>
                      <p className={over ? "font-semibold text-rose-700" : "text-stone-500"}>
                        week {gbp(newCost)}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          {error && <p className="p-3 text-sm text-rose-600">{error}</p>}
        </div>
      </dialog>
    </>
  );
}
