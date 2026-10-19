import Link from "next/link";
import { RECIPES_BY_SLUG } from "@/data/recipes";
import { BudgetBar } from "@/components/budget-bar";
import { MealCard } from "@/components/meal-card";
import { RegenerateWeekButton } from "@/components/regenerate-week-button";
import { ScrollToWeek } from "@/components/scroll-to-week";
import { PLAN_START, PLAN_WEEKS, TRIP_DATE } from "@/lib/constants";
import { weekCost } from "@/lib/cost";
import { daysBetween, formatDate, todayISO, weekDates, weekOf } from "@/lib/dates";
import { loadAppData } from "@/lib/data";
import { nutritionPerServing } from "@/lib/nutrition";
import { groupByWeek } from "@/lib/plan";

export default async function PlanPage() {
  const { slots, ratings, favourites, coverPhotos, prices } = await loadAppData();
  const weeks = groupByWeek(slots);
  const today = todayISO();
  const currentWeek = weekOf(today);
  const daysToTrip = daysBetween(today, TRIP_DATE);
  const started = today >= PLAN_START;

  const costs = weeks.map((w) => weekCost(w.map((s) => RECIPES_BY_SLUG[s.recipeSlug]), prices));
  const avgKcal = Math.round(
    slots.reduce((sum, s) => sum + nutritionPerServing(RECIPES_BY_SLUG[s.recipeSlug]).kcal, 0) / slots.length,
  );
  const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-16">
      <ScrollToWeek week={currentWeek ?? 0} />

      <section className="mt-6 grid gap-4 rounded-3xl bg-gradient-to-br from-emerald-700 to-teal-800 p-6 text-white sm:grid-cols-[1fr_auto] sm:p-8">
        <div>
          <p className="text-sm font-medium text-emerald-100">
            {started
              ? currentWeek !== null
                ? `Week ${currentWeek + 1} of ${PLAN_WEEKS}`
                : "Plan complete"
              : `Starts ${formatDate(PLAN_START, { weekday: "long", day: "numeric", month: "long" })}`}
          </p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
            {daysToTrip > 0 ? `${daysToTrip} days to Australia` : "Enjoy Australia!"}
          </h1>
          <p className="mt-2 max-w-xl text-emerald-50/90">
            20 weeks of lighter dinners for three: no fish, no nuts, under 1,000 kcal each, and £60 a week at Tesco.
          </p>
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
        const dates = weekDates(w);
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
              <BudgetBar cost={costs[w]} />
              <div className="flex gap-2">
                <Link
                  href={`/week/${w + 1}/shopping`}
                  className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
                >
                  Shopping list
                </Link>
                <RegenerateWeekButton week={w} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
              {weekSlots.map((slot) => (
                <MealCard
                  key={slot.date}
                  slot={slot}
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
