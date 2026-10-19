import { KCAL_CAP, SERVINGS } from "@/lib/constants";
import type { Nutrition } from "@/lib/types";

export function NutritionPanel({ n }: { n: Nutrition }) {
  const items = [
    ["Protein", n.protein],
    ["Carbs", n.carbs],
    ["Fat", n.fat],
    ["Fibre", n.fibre],
  ] as const;
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Per serving</h2>
        <span className="text-xs text-stone-500">Recipe serves {SERVINGS}</span>
      </div>
      <p className="mt-2 text-3xl font-bold">
        {n.kcal} <span className="text-base font-medium text-stone-500">kcal</span>
      </p>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100">
        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.min(100, (n.kcal / KCAL_CAP) * 100)}%` }} />
      </div>
      <p className="mt-1 text-xs text-stone-500">{KCAL_CAP - n.kcal} kcal under the 1,000 kcal cap</p>
      <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-stone-50 py-2">
            <dd className="font-semibold">{value}g</dd>
            <dt className="text-[11px] text-stone-500">{label}</dt>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[11px] leading-snug text-stone-400">
        Estimated from typical values for each ingredient. Brands vary.
      </p>
    </div>
  );
}
