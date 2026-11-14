import { RETIRED_RECIPES } from "@/data/recipes";
import { DEFAULT_QUICK_DAYS, SERVINGS } from "./constants";
import { weekCost, type PriceOverrides } from "./cost";
import { planDates, weekDates, weekOf } from "./dates";
import { planLibrary } from "./exclusions";
import { fitsSlot, generatePlan, isQuickNight } from "./generator";
import type { Library } from "./library";
import { isQuick } from "./nutrition";
import { store, type HouseholdStore } from "./store";
import { DEFAULT_STORE, effectivePrices, isStoreId } from "./stores";
import type { Allergen, IngredientMap, MealSlot, Plan, Recipe } from "./types";

/**
 * Fills in settings added after a plan was saved: quick nights (Monday to Wednesday) and
 * people and supermarket (3 at Tesco), which is how those plans were always planned.
 */
export function withPlanDefaults(
  plan: Partial<Plan> & Omit<Plan, "quickDays" | "people" | "store" | "excludedCategories" | "celiacSafe">,
): Plan {
  return {
    ...plan,
    quickDays: plan.quickDays ?? DEFAULT_QUICK_DAYS,
    people: plan.people ?? SERVINGS,
    store: isStoreId(plan.store) ? plan.store : DEFAULT_STORE,
    excludedCategories: plan.excludedCategories ?? [],
    celiacSafe: plan.celiacSafe === true,
  };
}

/** A household's plans plus the active one. A new household has no plans and so no active plan. */
export async function loadPlans(hs: HouseholdStore): Promise<{ plans: Plan[]; active: Plan | null }> {
  const [stored, activeId] = await Promise.all([hs.getPlans(), hs.getActivePlanId()]);
  const plans = stored.map(withPlanDefaults);
  const active = plans.find((p) => p.id === activeId) ?? null;
  // A missing active id (deleted plan) is cleared so the homepage can show the start CTA.
  if (activeId && !active) await hs.setActivePlanId(null);
  return { plans, active };
}

/** A price for every ingredient at the plan's supermarket, including shared corrections. */
export async function planPrices(plan: Pick<Plan, "store">, ingredients: IngredientMap): Promise<PriceOverrides> {
  const [corrections, tesco] = await Promise.all([
    store.getPriceOverrides(plan.store),
    plan.store === "tesco" ? undefined : store.getPriceOverrides("tesco"),
  ]);
  return effectivePrices(ingredients, plan.store, corrections, tesco);
}

async function householdAllergies(hs: HouseholdStore): Promise<Allergen[]> {
  return (await store.getHousehold(hs.householdId))?.allergies ?? [];
}

/** The plan's recipe library, scaled and with household-hidden, left-out and allergen recipes removed. */
export async function recipesForPlan(hs: HouseholdStore, plan: Plan, library: Library): Promise<Library> {
  const [hidden, allergies] = await Promise.all([hs.getHiddenRecipes(), householdAllergies(hs)]);
  return planLibrary(library, plan, hidden, allergies);
}

/** Generates every week of a plan from scratch without saving. */
export async function generateFullPlan(hs: HouseholdStore, plan: Plan, library: Library, seed?: number) {
  const [prices, usable, avoiding] = await Promise.all([
    planPrices(plan, library.ingredients),
    recipesForPlan(hs, plan, library),
    householdAllergies(hs),
  ]);
  return generatePlan({ plan, prices, library: usable, seed, avoiding });
}

/** Builds and saves every week of a plan from scratch. */
export async function buildPlan(hs: HouseholdStore, plan: Plan, library: Library, seed?: number) {
  const slots = await generateFullPlan(hs, plan, library, seed);
  await hs.replaceSlots(plan.id, planDates(plan), slots);
  return slots;
}

/** Loads a plan's dinners, generating them the first time and repairing any that no longer fit. */
export async function ensurePlanSlots(hs: HouseholdStore, plan: Plan, library: Library): Promise<MealSlot[]> {
  const [slots, usable, allergies] = await Promise.all([
    hs.getSlots(plan.id),
    recipesForPlan(hs, plan, library),
    householdAllergies(hs),
  ]);
  if (!slots.length) return buildPlan(hs, plan, library);
  return repairSlots(hs, plan, slots, usable, allergies);
}

/**
 * Points slots at a replacement when their recipe has been removed, deleted or excluded, or is too slow
 * for a quick night, preferring the recipe's named successor and otherwise the least-planned recipe
 * that fits the slot and budget.
 */
async function repairSlots(
  hs: HouseholdStore,
  plan: Plan,
  slots: MealSlot[],
  library: Library,
  allergies: readonly Allergen[],
): Promise<MealSlot[]> {
  const fits = (s: MealSlot) => {
    const r = library.bySlug[s.recipeSlug];
    return !!r && fitsSlot(r, s.role, s.date, plan.quickDays);
  };
  if (slots.every(fits)) return slots;

  const prices = await planPrices(plan, library.ingredients);
  const budget = plan.weeklyBudget;
  const counts = new Map<string, number>();
  for (const s of slots) counts.set(s.recipeSlug, (counts.get(s.recipeSlug) ?? 0) + 1);

  const repaired = slots.map((s) => ({ ...s }));
  for (const slot of repaired) {
    if (fits(slot)) continue;
    const week = weekOf(plan, slot.date);
    const weekSlots = repaired.filter((s) => weekOf(plan, s.date) === week);
    const inWeek = new Set(weekSlots.map((s) => s.recipeSlug));
    const usable = (r: Recipe | undefined): r is Recipe =>
      !!r && fitsSlot(r, slot.role, slot.date, plan.quickDays) && !inWeek.has(r.slug);
    const costWith = (r: Recipe) =>
      weekCost(
        weekSlots.map((s) => (s === slot ? r : library.bySlug[s.recipeSlug])).filter(Boolean),
        prices,
        library.ingredients,
      );

    const successor = library.bySlug[RETIRED_RECIPES[slot.recipeSlug] ?? ""];
    const options = library.recipes
      .filter(usable)
      .map((r) => ({ r, cost: costWith(r) }))
      .sort(
        (a, b) =>
          Number(a.cost > budget) - Number(b.cost > budget) ||
          (a.cost > budget ? a.cost - b.cost : 0) ||
          (counts.get(a.r.slug) ?? 0) - (counts.get(b.r.slug) ?? 0) ||
          a.r.slug.localeCompare(b.r.slug),
      );
    let role = slot.role;
    let pick =
      usable(successor) && costWith(successor) <= budget
        ? successor
        : (options[0]?.r ?? (usable(successor) ? successor : undefined));
    // A group with nothing safe becomes a mix-it-up night, the same fallback a tight plan uses.
    if (!pick && allergies.length && slot.role !== "extra") {
      const mix = (r: Recipe | undefined): r is Recipe =>
        !!r && fitsSlot(r, "extra", slot.date, plan.quickDays) && !inWeek.has(r.slug);
      pick = library.recipes.filter(mix).sort((a, b) => a.slug.localeCompare(b.slug))[0];
      if (pick) role = "extra";
    }
    // Still unsafe, and mix-it-up could not take the night (a quick night, or every safe dinner already used).
    // Repeat a safe dinner rather than keep one that contains an allergen the household avoids.
    if (!pick && !library.bySlug[slot.recipeSlug] && library.recipes.length) {
      const unused = library.recipes.filter((r) => !inWeek.has(r.slug));
      const pool = (unused.length ? unused : library.recipes).slice().sort((a, b) => a.slug.localeCompare(b.slug));
      const quickNight = isQuickNight(slot.date, plan.quickDays);
      pick = pool.find((r) => !quickNight || isQuick(r)) ?? pool[0];
      if (pick.category === "fakeaway") role = "fakeaway";
      else if (pick.category === "hearty") role = "hearty";
      else role = "extra";
    }
    if (!pick) continue;
    const roleChanged = role !== slot.role;
    slot.role = role;

    counts.set(pick.slug, (counts.get(pick.slug) ?? 0) + 1);
    slot.recipeSlug = pick.slug;
    await hs.setSlotRecipe(plan.id, slot.date, pick.slug, roleChanged ? role : undefined);
  }
  return repaired;
}

/** Regenerates the given weeks (0-based), keeping the rest of the plan for variety checks. */
export async function regenerateWeeks(
  hs: HouseholdStore,
  plan: Plan,
  weeks: number[],
  library: Library,
  seed = Date.now(),
) {
  const [existing, prices, usable] = await Promise.all([
    hs.getSlots(plan.id),
    planPrices(plan, library.ingredients),
    recipesForPlan(hs, plan, library),
  ]);
  const fresh = generatePlan({ plan, weeks, existing, prices, seed, library: usable });
  await hs.replaceSlots(plan.id, weeks.flatMap((w) => weekDates(plan, w)), fresh);
  return fresh;
}

export function groupByWeek(plan: Plan, slots: MealSlot[], library: Library) {
  const weeks: MealSlot[][] = Array.from({ length: plan.weeks }, () => []);
  for (const slot of slots) {
    const w = weekOf(plan, slot.date);
    if (w !== null && library.bySlug[slot.recipeSlug]) weeks[w].push(slot);
  }
  for (const w of weeks) w.sort((a, b) => a.date.localeCompare(b.date));
  return weeks;
}
