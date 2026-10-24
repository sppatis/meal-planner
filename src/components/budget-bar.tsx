import { gbp } from "@/lib/cost";

export function BudgetBar({ cost, budget }: { cost: number; budget: number }) {
  const pct = Math.min(100, (cost / budget) * 100);
  const over = cost > budget;
  return (
    <div className="min-w-40 flex-1">
      <div className="flex justify-between text-xs font-medium">
        <span className={over ? "text-rose-700" : "text-stone-600"}>
          {gbp(cost)} of {gbp(budget)}
        </span>
        <span className={over ? "text-rose-700" : "text-emerald-700"}>
          {over ? `${gbp(cost - budget)} over` : `${gbp(budget - cost)} spare`}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-stone-200">
        <div
          className={`h-full rounded-full ${over ? "bg-rose-500" : pct > 90 ? "bg-amber-500" : "bg-emerald-600"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
