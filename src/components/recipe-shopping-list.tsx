"use client";

import { useState, useTransition } from "react";
import { saveRecipeAmounts } from "@/app/actions";
import type { Unit } from "@/lib/types";
import { Checklist, type ChecklistItem } from "./checklist";

export interface RecipeShoppingLine {
  key: string;
  /** Amount already scaled to this plan, in the ingredient's unit. */
  qty: number;
  unit: Unit;
  name: string;
  /** Prep note such as "chopped". Not the cook's reminder. */
  prepNote?: string;
  primary: string;
  secondary?: string;
  meta?: string;
  href?: string;
  warning?: string;
}

interface Props {
  slug: string;
  planId: string | null;
  people: number;
  shop: string;
  note: string;
  lines: RecipeShoppingLine[];
}

const amountField =
  "w-24 rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm tabular-nums focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600";
const noteField =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600";

function unitLabel(unit: Unit) {
  return unit === "each" ? "each" : unit;
}

export function RecipeShoppingList({ slug, planId, people, shop, note, lines }: Props) {
  const [draft, setDraft] = useState<{ qtys: string[]; note: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const editing = draft !== null;

  function begin() {
    setError(null);
    setDraft({ qtys: lines.map((line) => String(line.qty)), note });
  }

  function cancel() {
    setError(null);
    setDraft(null);
  }

  function save() {
    if (!draft) return;
    const quantities = draft.qtys.map((qty) => Number(qty));
    if (quantities.some((qty) => !(qty > 0) || !Number.isFinite(qty))) {
      setError("Enter an amount greater than 0 for every ingredient");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveRecipeAmounts(slug, quantities, draft.note, planId);
      if (!result.ok) {
        setError(result.errors.join(" "));
        return;
      }
      setDraft(null);
    });
  }

  const items: ChecklistItem[] = lines.map((line) => ({
    id: line.key,
    primary: line.primary,
    secondary: line.secondary,
    meta: line.meta,
    href: line.href,
    warning: line.warning,
  }));

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2">
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl font-bold">Shopping list</h2>
          {!editing && (
            <button type="button" onClick={begin} className="btn-secondary no-print">
              Edit
            </button>
          )}
        </div>
        <span className="text-xs text-stone-500">
          For {people} · {shop} pack, est. price
        </span>
      </div>
      <div className="mt-2 rounded-2xl bg-white px-4 ring-1 ring-stone-200">
        {editing && draft ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <ul className="divide-y divide-stone-100">
              {lines.map((line, i) => (
                <li key={line.key} className="flex items-center gap-3 py-2.5">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    autoComplete="off"
                    aria-label={`${line.name} amount`}
                    value={draft.qtys[i]}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? { ...current, qtys: current.qtys.map((qty, index) => (index === i ? event.target.value : qty)) }
                          : current,
                      )
                    }
                    onWheel={(event) => event.currentTarget.blur()}
                    className={amountField}
                    required
                  />
                  <span className="w-10 shrink-0 text-sm text-stone-500">{unitLabel(line.unit)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{line.name}</span>
                    {line.prepNote && <span className="mt-0.5 block text-sm text-stone-500">{line.prepNote}</span>}
                  </span>
                </li>
              ))}
            </ul>
            <label className="mt-3 block pb-1" htmlFor="recipe-note">
              <span className="text-sm font-semibold">Notes</span>
              <textarea
                id="recipe-note"
                value={draft.note}
                onChange={(event) => setDraft((current) => (current ? { ...current, note: event.target.value } : current))}
                rows={3}
                maxLength={500}
                placeholder="Anything to remember next time"
                className={noteField}
              />
            </label>
            {error && (
              <p className="mt-2 text-sm text-rose-700" role="alert">
                {error}
              </p>
            )}
            <div className="flex gap-2 py-3">
              <button type="submit" className="btn-primary" disabled={pending}>
                {pending ? "Saving…" : "Save"}
              </button>
              <button type="button" className="btn-secondary" onClick={cancel} disabled={pending}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <Checklist storageKey={`recipe-check:${slug}`} items={items} linkLabel={shop} />
            {note && (
              <div className="border-t border-stone-100 py-3">
                <h3 className="text-sm font-semibold">Notes</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-stone-700">{note}</p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
