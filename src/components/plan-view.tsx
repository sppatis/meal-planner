import Link from "next/link";
import { BudgetBar } from "@/components/budget-bar";
import { MealCard } from "@/components/meal-card";
import { RegenerateWeekButton } from "@/components/regenerate-week-button";
import { ScrollToWeek } from "@/components/scroll-to-week";
import { KCAL_CAP } from "@/lib/constants";
import { gbp, weekCost } from "@/lib/cost";
import { daysBetween, formatDate, planEnd, todayISO, weekDates, weekOf } from "@/lib/dates";
import { loadAppData } from "@/lib/data";
import { nutritionPerServing } from "@/lib/nutrition";
import { groupByWeek } from "@/lib/plan";
import type { Plan } from "@/lib/types";
import { SetActivePlanButton } from "./set-active-plan-button";

export async function PlanView({ plan: requested }: { plan?: Plan }) {
  const { plan, isActive, library, ratings, favourites, coverPhotos, prices, slots } = await loadAppData(requested);
  const weeks = groupByWeek(plan, slots, library);
  const today = todayISO();
  const currentWeek = weekOf(plan, today);
  const end = planEnd(plan);
  const daysToGo = daysBetween(today, end);
  const started = today >= plan.startDate;

  const costs = weeks.map((w) =>
    weekCost(
      w.map((s) => library.bySlug[s.recipeSlug]),
      prices,
      library.ingredients,
    ),
  );
  const planned = weeks.flat();
  const avgKcal = planned.length
    ? Math.round(
        planned.reduce((sum, s) => sum + nutritionPerServing(library.bySlug[s.recipeSlug], library.ingredients).kcal, 0) /
          planned.length,
      )
    : 0;
  const avgCost = costs.length ? costs.reduce((a, b) => a + b, 0) / costs.length : 0;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-16">
      {isActive && <ScrollToWeek week={currentWeek ?? 0} />}

      {!isActive && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <span>You&apos;re viewing a plan that isn&apos;t active. The homepage shows the active plan.</span>
          <SetActivePlanButton planId={plan.id} />
        </div>
      )}

      <section className="mt-6 grid gap-4 rounded-3xl bg-gradient-to-br from-emerald-700 to-teal-800 p-6 text-white sm:grid-cols-[1fr_auto] sm:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-200">{plan.title}</p>
          <p className="mt-2 text-sm font-medium text-emerald-100">
            {started
              ? currentWeek !== null
                ? `Week ${currentWeek + 1} of ${plan.weeks}`
                : "Plan complete"
              : `Starts ${formatDate(plan.startDate, { weekday: "long", day: "numeric", month: "long" })}`}
          </p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
            {daysToGo > 0 ? `${daysToGo} days to go` : "All done. Well played!"}
          </h1>
          <p className="mt-2 max-w-xl text-emerald-50/90">
            {plan.weeks} weeks of lighter dinners for three: no fish, no nuts, under {KCAL_CAP.toLocaleString()} kcal
            each, and {gbp(plan.weeklyBudget).replace(".00", "")} a week at Tesco.
          </p>
          {plan.excluded.length > 0 && (
            <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-emerald-100">Leaving out:</span>
              {plan.excluded.map((t) => (
                <span key={t} className="rounded-full bg-white/15 px-2 py-0.5 font-medium">
                  {t}
                </span>
              ))}
            </p>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-3 self-end text-center">
          <div className="rounded-2xl bg-white/10 px-4 py-3">
            <dt className="text-xs text-emerald-100">Avg per dinner</dt>
            <dd className="text-2xl font-bold">{avgKcal} kcal</dd>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3">
            <dt className="text-xs text-emerald-100">Avg weekly shop</dt>
            <dd className="text-2xl font-bold">£{avgCost.toFixed(0)}</dd>
          </div>
        </dl>
      </section>

      <nav
        aria-label="Jump to week"
        className="no-print sticky top-[61px] z-10 -mx-4 mt-4 flex gap-1.5 overflow-x-auto bg-stone-50/95 px-4 py-2 backdrop-blur"
      >
        {weeks.map((_, w) => (
          <a
            key={w}
            href={`#week-${w + 1}`}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
              w === currentWeek ? "bg-emerald-700 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:ring-emerald-600"
            }`}
          >
            W{w + 1}
          </a>
        ))}
      </nav>

      {weeks.map((weekSlots, w) => {
        const dates = weekDates(plan, w);
        const weekSlugs = weekSlots.map((s) => s.recipeSlug);
        return (
          <section key={w} id={`week-${w + 1}`} className="mt-8">
            <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-3">
              <div>
                <h2 className="text-xl font-bold">
                  Week {w + 1}
                  {w === currentWeek && <span className="ml-2 text-sm font-medium text-emerald-700">This week</span>}
                </h2>
                <p className="text-sm text-stone-500">
                  {formatDate(dates[0])} to {formatDate(dates[6], { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <BudgetBar cost={costs[w]} budget={plan.weeklyBudget} />
              <div className="flex gap-2">
                <Link
                  href={`/week/${w + 1}/shopping?plan=${plan.id}`}
                  className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
                >
                  Shopping list
                </Link>
                <RegenerateWeekButton planId={plan.id} week={w} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
              {weekSlots.map((slot) => (
                <MealCard
                  key={slot.date}
                  plan={plan}
                  slot={slot}
                  recipe={library.bySlug[slot.recipeSlug]}
                  ingredients={library.ingredients}
                  weekSlugs={weekSlugs}
                  isToday={slot.date === today}
                  photo={coverPhotos[slot.recipeSlug]}
                  rating={ratings[slot.recipeSlug]}
                  favourites={favourites}
                  ratings={ratings}
                  prices={prices}
                />
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
