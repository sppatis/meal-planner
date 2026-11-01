/**
 * Usage:
 *   npm run generate-plan                 # (re)build all 20 weeks
 *   npm run generate-plan -- --week 5     # rebuild week 5 only (repeat or comma-separate for more)
 *   npm run generate-plan -- --dry-run    # print a plan without saving
 *   npm run generate-plan -- --seed 42    # reproducible shuffle
 *   npm run generate-plan -- --plan my-id # a plan other than the active one
 *   npm run generate-plan -- --household smith-family   # another household's plans (default: home)
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
  const { loadPlans, planPrices } = await import("../src/lib/plan");
  const { storeName: supermarketName } = await import("../src/lib/stores");
  const { generatePlan } = await import("../src/lib/generator");
  const { buildLibrary } = await import("../src/lib/library");
  const { nutritionPerServing } = await import("../src/lib/nutrition");
  const { HOME_HOUSEHOLD, store, storeName } = await import("../src/lib/store");

  const householdId = values("household")[0] ?? HOME_HOUSEHOLD;
  const household = await store.getHousehold(householdId);
  if (!household) throw new Error(`No household "${householdId}". Run npm run household -- list.`);
  const hs = store.forHousehold(household.id);
  const { plans, active } = await loadPlans(hs);
  console.log(`Household: ${household.name} (${household.id})`);
  const planId = values("plan")[0];
  const plan = planId ? plans.find((p) => p.id === planId) : active;
  if (!plan) {
    throw new Error(plans.length ? `No plan "${planId}". Plans: ${plans.map((p) => p.id).join(", ")}` : "This household has no plans yet.");
  }
  console.log(`Plan: ${plan.title} (${plan.id}), ${plan.people} people at ${supermarketName(plan.store)}`);

  const weeks = values("week").map((w) => Number(w) - 1);
  if (weeks.some((w) => !(w >= 0 && w < plan.weeks))) throw new Error(`--week must be 1-${plan.weeks}`);
  const seedArg = values("seed")[0];
  const seed = seedArg ? Number(seedArg) : weeks.length ? Date.now() : undefined;

  const [existing, customRecipes, customIngredients] = await Promise.all([
    hs.getSlots(plan.id),
    store.getCustomRecipes(),
    store.getCustomIngredients(),
  ]);
  const library = planLibrary(buildLibrary(customRecipes, customIngredients), plan);
  const prices = await planPrices(plan, library.ingredients);
  const slotsOut = generatePlan({
    plan,
    weeks: weeks.length ? weeks : undefined,
    existing,
    prices,
    seed,
    library,
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
  await hs.replaceSlots(plan.id, dates, slotsOut);
  console.log(`\nSaved ${slotsOut.length} dinners to ${storeName}.`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
