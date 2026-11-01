import type { Metadata } from "next";
import Link from "next/link";
import { DeleteInactivePlansButton } from "@/components/delete-inactive-plans-button";
import { DeletePlanButton } from "@/components/delete-plan-button";
import { PlanActiveToggle } from "@/components/plan-active-toggle";
import { CATEGORY_LABELS } from "@/lib/constants";
import { gbp } from "@/lib/cost";
import { addDays, formatDate, listDays, planEnd, todayISO } from "@/lib/dates";
import { loadPlanList } from "@/lib/data";
import { storeName } from "@/lib/stores";
import type { Plan } from "@/lib/types";

export const metadata: Metadata = { title: "Plans" };

function status(plan: Plan, today: string) {
  if (today < plan.startDate) return { text: "Upcoming", style: "bg-sky-100 text-sky-800" };
  if (today >= planEnd(plan)) return { text: "Finished", style: "bg-stone-200 text-stone-600" };
  return { text: "In progress", style: "bg-amber-100 text-amber-800" };
}

export default async function PlansPage() {
  const { plans, active } = await loadPlanList();
  const today = todayISO();
  const long = { day: "numeric", month: "short", year: "numeric" } as const;
  const inactiveCount = plans.filter((p) => p.id !== active?.id).length;

  return (
    <main className="mx-auto max-w-4xl px-4 pb-16">
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Plans</h1>
          <p className="mt-2 text-stone-600">
            The active plan is the one shown on the homepage. Turn a plan off to clear the homepage, or delete any plan
            that isn&apos;t active.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DeleteInactivePlansButton count={inactiveCount} />
          <Link
            href="/plans/new"
            className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            + New plan
          </Link>
        </div>
      </div>

      {plans.length === 0 && (
        <p className="mt-6 rounded-2xl border border-dashed border-stone-300 p-5 text-sm text-stone-600">
          You don&apos;t have a plan yet.{" "}
          <Link href="/plans/new" className="font-medium text-emerald-700 hover:underline">
            Start a new plan
          </Link>{" "}
          and it&apos;ll appear on the homepage.
        </p>
      )}

      <ul className="mt-6 space-y-3">
        {plans.map((plan) => {
          const isActive = plan.id === active?.id;
          const s = status(plan, today);
          return (
            <li
              key={plan.id}
              className={`rounded-2xl bg-white p-5 ring-1 ${isActive ? "ring-2 ring-emerald-600" : "ring-stone-200"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={isActive ? "/" : `/plans/${plan.id}`} className="text-lg font-bold hover:text-emerald-800">
                      {plan.title}
                    </Link>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.style}`}>{s.text}</span>
                  </div>
                  <p className="mt-1 text-sm text-stone-600">
                    {formatDate(plan.startDate, long)} to {formatDate(addDays(planEnd(plan), -1), long)} · {plan.weeks}{" "}
                    {plan.weeks === 1 ? "week" : "weeks"} · {gbp(plan.weeklyBudget)} a week
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    {plan.people} {plan.people === 1 ? "person" : "people"} · Shopping at {storeName(plan.store)}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    {plan.quickDays.length ? `Quick nights: ${listDays(plan.quickDays)}` : "No quick nights"}
                  </p>
                  {(plan.excludedCategories.length > 0 || plan.excluded.length > 0) && (
                    <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-stone-500">Leaving out:</span>
                      {plan.excludedCategories.map((c) => (
                        <span
                          key={c}
                          className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-900 ring-1 ring-amber-200"
                        >
                          {CATEGORY_LABELS[c]}
                        </span>
                      ))}
                      {plan.excluded.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-rose-50 px-2 py-0.5 font-medium text-rose-800 ring-1 ring-rose-200"
                        >
                          {t}
                        </span>
                      ))}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <PlanActiveToggle planId={plan.id} active={isActive} />
                  <Link
                    href={isActive ? "/" : `/plans/${plan.id}`}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100"
                  >
                    View
                  </Link>
                  <Link
                    href={`/plans/${plan.id}/edit`}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100"
                  >
                    Edit
                  </Link>
                  {!isActive && <DeletePlanButton planId={plan.id} title={plan.title} />}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
