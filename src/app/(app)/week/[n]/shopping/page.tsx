import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BudgetBar } from "@/components/budget-bar";
import { Checklist } from "@/components/checklist";
import { CopyButton } from "@/components/copy-button";
import { PrintButton } from "@/components/print-button";
import { DAY_NAMES, PLAN_WEEKS } from "@/lib/constants";
import { AISLE_ORDER, gbp, priceOf, shoppingList, tescoSearchUrl, type ShoppingLine } from "@/lib/cost";
import { dayIndex, formatDate, weekDates } from "@/lib/dates";
import { formatQty } from "@/lib/format";
import { loadLibrary } from "@/lib/data";
import { ensurePlan, groupByWeek } from "@/lib/plan";
import { store } from "@/lib/store";

export async function generateMetadata({ params }: PageProps<"/week/[n]/shopping">): Promise<Metadata> {
  return { title: `Week ${(await params).n} shopping list` };
}

function packText(line: ShoppingLine) {
  const need = formatQty(line.ingredient, line.qty);
  if (line.packs === null) return `Need ${need}`;
  return `Buy ${line.packs} × ${line.ingredient.packLabel} · need ${need}`;
}

export default async function ShoppingPage({ params }: PageProps<"/week/[n]/shopping">) {
  const week = Number((await params).n) - 1;
  if (!(Number.isInteger(week) && week >= 0 && week < PLAN_WEEKS)) notFound();

  const library = await loadLibrary();
  const [slots, prices] = await Promise.all([ensurePlan(library), store.getPriceOverrides()]);
  const weekSlots = groupByWeek(slots, library)[week];
  const recipes = weekSlots.map((s) => library.bySlug[s.recipeSlug]);
  const list = shoppingList(recipes, prices, library.ingredients);
  const dates = weekDates(week);

  const fresh = list.lines.filter((l) => l.packs !== null);
  const staples = list.lines.filter((l) => l.packs === null);
  const byAisle = AISLE_ORDER.map((aisle) => ({
    aisle,
    lines: fresh.filter((l) => l.ingredient.aisle === aisle).sort((a, b) => a.ingredient.name.localeCompare(b.ingredient.name)),
  })).filter((g) => g.lines.length);

  const plainText = [
    `Week ${week + 1} shopping (${formatDate(dates[0])} to ${formatDate(dates[6])})`,
    ...byAisle.flatMap((g) => [
      "",
      g.aisle.toUpperCase(),
      ...g.lines.map((l) => `- ${l.ingredient.name}: ${l.packs} × ${l.ingredient.packLabel}`),
    ]),
    "",
    "CUPBOARD CHECK",
    ...staples.map((l) => `- ${l.ingredient.name} (need ${formatQty(l.ingredient, l.qty)})`),
  ].join("\n");

  const toItem = (l: ShoppingLine) => ({
    id: l.ingredient.id,
    primary: l.ingredient.name,
    secondary: `${packText(l)} · for ${l.usedIn.join(", ")}`,
    meta: l.packs === null ? `${gbp(l.cost)} share` : gbp(l.packs * priceOf(l.ingredient, prices)),
    href: tescoSearchUrl(l.ingredient),
    warning: l.ingredient.checkLabel,
  });

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16">
      <Link href={`/#week-${week + 1}`} className="no-print mt-4 inline-block text-sm text-stone-500 hover:text-emerald-700">
        ← Back to week {week + 1}
      </Link>
      <h1 className="mt-2 text-3xl font-bold">Week {week + 1} shopping list</h1>
      <p className="text-stone-500">
        {formatDate(dates[0], { weekday: "long", day: "numeric", month: "long" })} to{" "}
        {formatDate(dates[6], { weekday: "long", day: "numeric", month: "long" })}
      </p>

      <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-stone-200">
        <BudgetBar cost={list.total} />
        <p className="mt-2 text-xs text-stone-500">
          {gbp(list.freshTotal)} this week&apos;s shop plus {gbp(list.stapleTotal)} share of cupboard staples. Estimated Tesco prices,
          which you can adjust on the{" "}
          <Link href="/prices" className="text-emerald-700 underline">
            Prices
          </Link>{" "}
          page.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <CopyButton text={plainText} label="Copy list" />
          <PrintButton />
        </div>
      </div>

      <section className="mt-6">
        <h2 className="text-lg font-bold">This week&apos;s dinners</h2>
        <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          {weekSlots.map((s) => (
            <li key={s.date}>
              <Link href={`/recipe/${s.recipeSlug}?date=${s.date}`} className="flex gap-2 hover:text-emerald-700">
                <span className="w-24 shrink-0 text-stone-500">{DAY_NAMES[dayIndex(s.date)]}</span>
                <span>{library.bySlug[s.recipeSlug].name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {byAisle.map((g) => (
        <section key={g.aisle} className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">{g.aisle}</h2>
          <div className="mt-1 rounded-2xl bg-white px-4 ring-1 ring-stone-200">
            <Checklist storageKey={`week-check:${week}:${g.aisle}`} items={g.lines.map(toItem)} />
          </div>
        </section>
      ))}

      <section className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">Cupboard check</h2>
        <p className="text-xs text-stone-500">
          Long-life items that last several weeks. Only top up what&apos;s running low.
        </p>
        <div className="mt-1 rounded-2xl bg-white px-4 ring-1 ring-stone-200">
          <Checklist storageKey={`week-check:${week}:cupboard`} items={staples.map(toItem)} />
        </div>
      </section>
    </main>
  );
}
