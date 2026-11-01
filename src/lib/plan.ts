import { RETIRED_RECIPES } from "@/data/recipes";
import { DEFAULT_PLAN, DEFAULT_QUICK_DAYS } from "./constants";
import { weekCost } from "./cost";
import { addDays, mondayOf, planDates, todayISO, weekDates, weekOf } from "./dates";
import { planLibrary } from "./exclusions";
import { fitsSlot, generatePlan } from "./generator";
import { CUSTOM_PREFIX, slugify, type Library } from "./library";
import { HOME_HOUSEHOLD, store, type Household, type HouseholdStore } from "./store";
import type { MealSlot, Plan, Recipe } from "./types";

/** The plan a household starts with: Road to Australia for the original household, a blank slate for others. */
function starterPlan(household: Pick<Household, "id" | "name">): Plan {
  const createdAt = new Date().toISOString();
  if (household.id === HOME_HOUSEHOLD) return { ...DEFAULT_PLAN, createdAt };
  const title = `${household.name} dinners`.slice(0, 60);
  return {
    ...DEFAULT_PLAN,
    id: slugify(title).slice(CUSTOM_PREFIX.length) || "plan",
    title,
    startDate: mondayOf(addDays(todayISO(), 7)),
    createdAt,
  };
}

/** A household's plans plus the active one, creating its starter plan the first time. */
export async function loadPlans(
  hs: HouseholdStore,
  household: Pick<Household, "id" | "name">,
): Promise<{ plans: Plan[]; active: Plan }> {
  const [stored, activeId] = await Promise.all([hs.getPlans(), hs.getActivePlanId()]);
  // Plans saved before quick nights were configurable used Monday to Wednesday.
  let plans = stored.map((p) => ({ ...p, quickDays: p.quickDays ?? DEFAULT_QUICK_DAYS }));
  if (!plans.length) {
    const first = starterPlan(household);
    await hs.savePlan(first);
    plans = [first];
  }
  let active = plans.find((p) => p.id === activeId);
  if (!active) {
    active = plans[0];
    await hs.setActivePlanId(active.id);
  }
  return { plans, active };
}

/** Generates every week of a plan from scratch without saving. */
export async function generateFullPlan(plan: Plan, library: Library, seed?: number) {
  const prices = await store.getPriceOverrides();
  return generatePlan({ plan, prices, library: planLibrary(library, plan), seed });
}

/** Builds and saves every week of a plan from scratch. */
export async function buildPlan(hs: HouseholdStore, plan: Plan, library: Library, seed?: number) {
  const slots = await generateFullPlan(plan, library, seed);
  await hs.replaceSlots(plan.id, planDates(plan), slots);
  return slots;
}

/** Loads a plan's dinners, generating them the first time and repairing any that no longer fit. */
export async function ensurePlanSlots(hs: HouseholdStore, plan: Plan, library: Library): Promise<MealSlot[]> {
  const slots = await hs.getSlots(plan.id);
  if (!slots.length) return buildPlan(hs, plan, library);
  return repairSlots(hs, plan, slots, planLibrary(library, plan));
}

/**
 * Points slots at a replacement when their recipe has been removed, deleted or excluded, or is too slow
 * for a quick night, preferring the recipe's named successor and otherwise the least-planned recipe
 * that fits the slot and budget.
 */
async function repairSlots(hs: HouseholdStore, plan: Plan, slots: MealSlot[], library: Library): Promise<MealSlot[]> {
  const fits = (s: MealSlot) => {
    const r = library.bySlug[s.recipeSlug];
    return !!r && fitsSlot(r, s.role, s.date, plan.quickDays);
  };
  if (slots.every(fits)) return slots;

  const prices = await store.getPriceOverrides();
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
    const pick =
      usable(successor) && costWith(successor) <= budget
        ? successor
        : (options[0]?.r ?? (usable(successor) ? successor : undefined));
    if (!pick) continue;

    counts.set(pick.slug, (counts.get(pick.slug) ?? 0) + 1);
    slot.recipeSlug = pick.slug;
    await hs.setSlotRecipe(plan.id, slot.date, pick.slug);
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
  const [existing, prices] = await Promise.all([hs.getSlots(plan.id), store.getPriceOverrides()]);
  const fresh = generatePlan({ plan, weeks, existing, prices, seed, library: planLibrary(library, plan) });
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
