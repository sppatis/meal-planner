"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import { savePlan, type PlanDraft } from "@/app/actions";
import {
  CATEGORY_LABELS,
  DAY_NAMES,
  DAY_SHORT,
  DEFAULT_QUICK_DAYS,
  DEFAULT_WEEKLY_BUDGET,
  MAX_PLAN_WEEKS,
  QUICK_MAX_MINS,
} from "@/lib/constants";
import { addDays, formatDate, listDays, mondayOf, todayISO } from "@/lib/dates";
import { excludedBy, normaliseTerm } from "@/lib/exclusions";
import { isQuick } from "@/lib/nutrition";
import type { Category, Plan } from "@/lib/types";
import { useLibrary } from "./library-provider";

const field =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600";
const label = "mb-1 block text-xs font-semibold text-stone-600";

interface Props {
  plan?: Plan;
  isActive?: boolean;
}

export function PlanForm({ plan, isActive = false }: Props) {
  const router = useRouter();
  const library = useLibrary();
  const listId = useId();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);

  const [title, setTitle] = useState(plan?.title ?? "");
  const [startDate, setStartDate] = useState(plan?.startDate ?? mondayOf(addDays(todayISO(), 7)));
  const [weeks, setWeeks] = useState(String(plan?.weeks ?? 12));
  const [budget, setBudget] = useState(String(plan?.weeklyBudget ?? DEFAULT_WEEKLY_BUDGET));
  const [excluded, setExcluded] = useState<string[]>(plan?.excluded ?? []);
  const [term, setTerm] = useState("");
  const [quickDays, setQuickDays] = useState<number[]>(plan?.quickDays ?? DEFAULT_QUICK_DAYS);
  const [makeActive, setMakeActive] = useState(!plan);
  const [rebuild, setRebuild] = useState(false);

  const monday = /^\d{4}-\d{2}-\d{2}$/.test(startDate) ? mondayOf(startDate) : "";
  const datesChanged = !!plan && (monday !== plan.startDate || Number(weeks) !== plan.weeks);

  const suggestions = useMemo(
    () =>
      [...new Set(Object.values(library.ingredients).map((i) => i.name.replace(/\s*\(.*\)/, "").toLowerCase()))].sort(),
    [library],
  );

  const leftOut = useMemo(
    () =>
      library.recipes
        .map((r) => ({ recipe: r, term: excludedBy(r, excluded, library.ingredients) }))
        .filter((x): x is { recipe: typeof x.recipe; term: string } => !!x.term),
    [library, excluded],
  );
  const emptied = (Object.keys(CATEGORY_LABELS) as Category[]).filter(
    (c) =>
      library.recipes.some((r) => r.category === c) && !library.recipes.some((r) => r.category === c && !leftOut.some((x) => x.recipe === r)),
  );
  const quickRecipes = library.recipes.filter((r) => isQuick(r) && !leftOut.some((x) => x.recipe === r));
  const quickFakeaways = quickRecipes.filter((r) => r.category === "fakeaway").length;

  function toggleDay(day: number) {
    setQuickDays((days) => (days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort((a, b) => a - b)));
  }

  function addTerm(raw: string) {
    const parts = raw.split(",").map((t) => t.trim()).filter((t) => t.length >= 2);
    if (!parts.length) return;
    setExcluded((list) => {
      const seen = new Set(list.map(normaliseTerm));
      const next = [...list];
      for (const p of parts) {
        if (!seen.has(normaliseTerm(p))) {
          next.push(p.toLowerCase());
          seen.add(normaliseTerm(p));
        }
      }
      return next;
    });
    setTerm("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    const pendingTerm = term.trim();
    const draft: PlanDraft = {
      id: plan?.id,
      title,
      startDate,
      weeks: Number(weeks),
      weeklyBudget: Number(budget),
      excluded: pendingTerm ? [...excluded, pendingTerm.toLowerCase()] : excluded,
      quickDays,
      makeActive,
      rebuild,
    };
    if (pendingTerm) addTerm(pendingTerm);
    startTransition(async () => {
      const res = await savePlan(draft);
      if (res.ok) router.push(res.active ? "/" : `/plans/${res.id}`);
      else {
        setErrors(res.errors);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  return (
    <form onSubmit={submit} className="mt-6 max-w-2xl space-y-6">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200" role="alert">
          <p className="font-semibold">Please fix these before saving:</p>
          <ul className="mt-1 list-disc pl-5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-stone-200">
        <div>
          <label className={label} htmlFor="title">
            Plan title
          </label>
          <input
            id="title"
            className={field}
            value={title}
            placeholder="e.g. Road to Australia"
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className={label} htmlFor="start">
              Start date
            </label>
            <input id="start" type="date" className={field} value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </div>
          <div>
            <label className={label} htmlFor="weeks">
              Number of weeks
            </label>
            <input
              id="weeks"
              type="number"
              min={1}
              max={MAX_PLAN_WEEKS}
              className={field}
              value={weeks}
              onChange={(e) => setWeeks(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={label} htmlFor="budget">
              Weekly budget (£)
            </label>
            <input
              id="budget"
              type="number"
              min={10}
              step="0.5"
              className={field}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              required
            />
          </div>
        </div>
        {monday && Number(weeks) > 0 && (
          <p className="text-xs text-stone-500">
            Weeks run Monday to Sunday, so this plan runs from{" "}
            <b>{formatDate(monday, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</b> to{" "}
            <b>
              {formatDate(addDays(monday, Number(weeks) * 7 - 1), {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </b>
            .
          </p>
        )}
      </section>

      <fieldset className="rounded-2xl bg-white p-5 ring-1 ring-stone-200">
        <legend className="float-left font-bold">Quick nights</legend>
        <p className="clear-left pt-1 text-xs text-stone-500">
          Pick the evenings you&apos;re short on time. Those nights get a dinner ready in {QUICK_MAX_MINS} minutes or
          less.
        </p>
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {DAY_SHORT.map((d, i) => {
            const on = quickDays.includes(i);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                aria-label={DAY_NAMES[i]}
                onClick={() => toggleDay(i)}
                className={`rounded-xl py-2.5 text-sm font-semibold ring-1 transition ${
                  on
                    ? "bg-sky-600 text-white ring-sky-600 hover:bg-sky-700"
                    : "bg-white text-stone-600 ring-stone-300 hover:ring-sky-600"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-stone-600">
          {quickDays.length
            ? `Quick dinners on ${listDays(quickDays)}, chosen from ${quickRecipes.length} quick recipes.`
            : "No quick nights: any dinner can go on any night."}
        </p>
        {quickDays.includes(4) && quickDays.includes(5) && (
          <p className="mt-1 text-xs text-amber-700">
            {quickFakeaways
              ? `Friday and Saturday are both quick, and only ${quickFakeaways} fake-away${quickFakeaways === 1 ? " is" : "s are"} quick, so ${quickFakeaways === 1 ? "it" : "they"}'ll come round often.`
              : "Friday and Saturday are both quick, and no fake-aways are quick, so that night will be a \"mix it up\" dinner."}
          </p>
        )}
      </fieldset>

      <section className="rounded-2xl bg-white p-5 ring-1 ring-stone-200">
        <label className="font-bold" htmlFor="exclude">
          Ingredients to leave out
        </label>
        <p className="mt-1 text-xs text-stone-500">
          Type an ingredient and press Enter. Any dinner that uses it won&apos;t be planned. Fish and nuts are always left
          out.
        </p>
        <input
          id="exclude"
          list={listId}
          className={`${field} mt-3`}
          value={term}
          placeholder="e.g. mushrooms"
          onChange={(e) => {
            if (e.target.value.endsWith(",")) addTerm(e.target.value);
            else setTerm(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTerm(term);
            } else if (e.key === "Backspace" && !term && excluded.length) {
              setExcluded((list) => list.slice(0, -1));
            }
          }}
        />
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        {excluded.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Left out">
            {excluded.map((t) => (
              <li
                key={t}
                className="flex items-center gap-1 rounded-full bg-rose-50 py-1 pl-3 pr-1 text-sm font-medium text-rose-800 ring-1 ring-rose-200"
              >
                {t}
                <button
                  type="button"
                  aria-label={`Remove ${t}`}
                  onClick={() => setExcluded((list) => list.filter((x) => x !== t))}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-rose-500 hover:bg-rose-200 hover:text-rose-900"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        {excluded.length > 0 && (
          <div className="mt-4 rounded-xl bg-stone-50 p-3 text-xs text-stone-600">
            <p>
              <b>
                {leftOut.length} of {library.recipes.length}
              </b>{" "}
              dinners left out{leftOut.length ? ": " : "."}
              {leftOut
                .slice(0, 12)
                .map((x) => x.recipe.name)
                .join(", ")}
              {leftOut.length > 12 ? ` and ${leftOut.length - 12} more.` : leftOut.length ? "." : ""}
            </p>
            {excluded
              .filter((t) => !leftOut.some((x) => x.term === t))
              .map((t) => (
                <p key={t} className="mt-1 text-amber-700">
                  &quot;{t}&quot; doesn&apos;t match any ingredient in the recipes.
                </p>
              ))}
            {emptied.length > 0 && (
              <p className="mt-1 text-amber-700">
                No {emptied.map((c) => CATEGORY_LABELS[c].toLowerCase()).join(" or ")} dinners are left, so those nights
                will be &quot;mix it up&quot; dinners instead.
              </p>
            )}
          </div>
        )}
      </section>

      {(!plan || !isActive) && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={makeActive} onChange={(e) => setMakeActive(e.target.checked)} />
          Make this the active plan on the homepage
        </label>
      )}
      {plan && (
        <div className="rounded-2xl bg-white p-4 text-sm ring-1 ring-stone-200">
          {datesChanged ? (
            <p className="text-amber-800">
              The dates have changed, so every dinner will be planned again. Any swaps you&apos;ve made will be replaced.
            </p>
          ) : (
            <>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={rebuild} onChange={(e) => setRebuild(e.target.checked)} />
                Re-plan every dinner with these settings
              </label>
              <p className="mt-1 pl-6 text-xs text-stone-500">
                Otherwise your current dinners are kept, and only ones using a left-out ingredient or too slow for a
                quick night are swapped. Tick this after changing the budget.
              </p>
            </>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-emerald-700 px-5 py-2.5 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {pending ? (plan ? "Saving..." : "Planning dinners...") : plan ? "Save plan" : "Create plan"}
        </button>
        <Link href="/plans" className="text-sm text-stone-500 hover:text-stone-800">
          Cancel
        </Link>
      </div>
    </form>
  );
}
