/**
 * Usage:
 *   npm run generate-plan                 # (re)build all 20 weeks
 *   npm run generate-plan -- --week 5     # rebuild week 5 only (repeat or comma-separate for more)
 *   npm run generate-plan -- --dry-run    # print a plan without saving
 *   npm run generate-plan -- --seed 42    # reproducible shuffle
 *   npm run generate-plan -- --plan my-id # a plan other than the active one
 */
import { existsSync } from "fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const values = (name: string) =>
  args.flatMap((a, i) => (a === `--${name}` && args[i + 1] ? args[i + 1].split(",") : []));

async function main() {
  const { weekCost } = await import("../src/lib/cost");
  const { formatDate, weekDates, weekOf } = await import("../src/lib/dates");
  const { planLibrary } = await import("../src/lib/exclusions");
  const { loadPlans } = await import("../src/lib/plan");
  const { generatePlan } = await import("../src/lib/generator");
  const { buildLibrary } = await import("../src/lib/library");
  const { nutritionPerServing } = await import("../src/lib/nutrition");
  const { store, storeName } = await import("../src/lib/store");

  const { plans, active } = await loadPlans();
  const planId = values("plan")[0];
  const plan = planId ? plans.find((p) => p.id === planId) : active;
  if (!plan) throw new Error(`No plan "${planId}". Plans: ${plans.map((p) => p.id).join(", ")}`);
  console.log(`Plan: ${plan.title} (${plan.id})`);

  const weeks = values("week").map((w) => Number(w) - 1);
  if (weeks.some((w) => !(w >= 0 && w < plan.weeks))) throw new Error(`--week must be 1-${plan.weeks}`);
  const seedArg = values("seed")[0];
  const seed = seedArg ? Number(seedArg) : weeks.length ? Date.now() : undefined;

  const [existing, prices, customRecipes, customIngredients] = await Promise.all([
    store.getSlots(plan.id),
    store.getPriceOverrides(),
    store.getCustomRecipes(),
    store.getCustomIngredients(),
  ]);
  const library = buildLibrary(customRecipes, customIngredients);
  const slotsOut = generatePlan({
    plan,
    weeks: weeks.length ? weeks : undefined,
    existing,
    prices,
    seed,
    library: planLibrary(library, plan),
  });

  const byWeek = new Map<number, typeof slotsOut>();
  for (const s of slotsOut) {
    const w = weekOf(plan, s.date)!;
    byWeek.set(w, [...(byWeek.get(w) ?? []), s]);
  }
  for (const [w, slots] of [...byWeek].sort((a, b) => a[0] - b[0])) {
    const recipes = slots.map((s) => library.bySlug[s.recipeSlug]);
    const cost = weekCost(recipes, prices, library.ingredients);
    console.log(`\nWeek ${w + 1} (${formatDate(slots[0].date)}): £${cost.toFixed(2)}${cost > plan.weeklyBudget ? "  OVER BUDGET" : ""}`);
    for (const s of slots) {
      const r = library.bySlug[s.recipeSlug];
      console.log(`  ${formatDate(s.date, { weekday: "short" })}  ${s.role.padEnd(8)} ${String(nutritionPerServing(r, library.ingredients).kcal).padStart(4)} kcal  ${r.name}`);
    }
  }

  if (flag("dry-run")) return console.log("\nDry run: nothing saved.");
  const dates = (weeks.length ? weeks : Array.from({ length: plan.weeks }, (_, i) => i)).flatMap((w) =>
    weekDates(plan, w),
  );
  await store.replaceSlots(plan.id, dates, slotsOut);
  console.log(`\nSaved ${slotsOut.length} dinners to ${storeName}.`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
