/**
 * Usage:
 *   npm run generate-plan                 # (re)build all 20 weeks
 *   npm run generate-plan -- --week 5     # rebuild week 5 only (repeat or comma-separate for more)
 *   npm run generate-plan -- --dry-run    # print a plan without saving
 *   npm run generate-plan -- --seed 42    # reproducible shuffle
 */
import { existsSync } from "fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const values = (name: string) =>
  args.flatMap((a, i) => (a === `--${name}` && args[i + 1] ? args[i + 1].split(",") : []));

async function main() {
  const { RECIPES_BY_SLUG } = await import("../src/data/recipes");
  const { PLAN_WEEKS, WEEKLY_BUDGET } = await import("../src/lib/constants");
  const { weekCost } = await import("../src/lib/cost");
  const { formatDate, weekDates, weekOf } = await import("../src/lib/dates");
  const { generatePlan } = await import("../src/lib/generator");
  const { nutritionPerServing } = await import("../src/lib/nutrition");
  const { store, usingSupabase } = await import("../src/lib/store");

  const weeks = values("week").map((w) => Number(w) - 1);
  if (weeks.some((w) => !(w >= 0 && w < PLAN_WEEKS))) throw new Error(`--week must be 1-${PLAN_WEEKS}`);
  const seedArg = values("seed")[0];
  const seed = seedArg ? Number(seedArg) : weeks.length ? Date.now() : undefined;

  const [existing, prices] = await Promise.all([store.getSlots(), store.getPriceOverrides()]);
  const plan = generatePlan({ weeks: weeks.length ? weeks : undefined, existing, prices, seed });

  const byWeek = new Map<number, typeof plan>();
  for (const s of plan) {
    const w = weekOf(s.date)!;
    byWeek.set(w, [...(byWeek.get(w) ?? []), s]);
  }
  for (const [w, slots] of [...byWeek].sort((a, b) => a[0] - b[0])) {
    const recipes = slots.map((s) => RECIPES_BY_SLUG[s.recipeSlug]);
    const cost = weekCost(recipes, prices);
    console.log(`\nWeek ${w + 1} (${formatDate(slots[0].date)}): £${cost.toFixed(2)}${cost > WEEKLY_BUDGET ? "  OVER BUDGET" : ""}`);
    for (const s of slots) {
      const r = RECIPES_BY_SLUG[s.recipeSlug];
      console.log(`  ${formatDate(s.date, { weekday: "short" })}  ${s.role.padEnd(8)} ${String(nutritionPerServing(r).kcal).padStart(4)} kcal  ${r.name}`);
    }
  }

  if (flag("dry-run")) return console.log("\nDry run: nothing saved.");
  const dates = (weeks.length ? weeks : Array.from({ length: PLAN_WEEKS }, (_, i) => i)).flatMap(weekDates);
  await store.replaceSlots(dates, plan);
  console.log(`\nSaved ${plan.length} dinners to ${usingSupabase ? "Supabase" : ".data/db.json"}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
