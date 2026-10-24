import { RETIRED_RECIPES } from "@/data/recipes";
import { DEFAULT_PLAN } from "./constants";
import { weekCost } from "./cost";
import { planDates, weekDates, weekOf } from "./dates";
import { planLibrary } from "./exclusions";
import { fitsSlot, generatePlan } from "./generator";
import type { Library } from "./library";
import { store } from "./store";
import type { MealSlot, Plan, Recipe } from "./types";

/** All plans plus the active one, creating the original plan the first time. */
export async function loadPlans(): Promise<{ plans: Plan[]; active: Plan }> {
  const [stored, activeId] = await Promise.all([store.getPlans(), store.getActivePlanId()]);
  let plans = stored;
  if (!plans.length) {
    const first: Plan = { ...DEFAULT_PLAN, createdAt: new Date().toISOString() };
    await store.savePlan(first);
    plans = [first];
  }
  let active = plans.find((p) => p.id === activeId);
  if (!active) {
    active = plans[0];
    await store.setActivePlanId(active.id);
  }
  return { plans, active };
}

/** Generates every week of a plan from scratch without saving. */
export async function generateFullPlan(plan: Plan, library: Library, seed?: number) {
  const prices = await store.getPriceOverrides();
  return generatePlan({ plan, prices, library: planLibrary(library, plan), seed });
}

/** Builds and saves every week of a plan from scratch. */
export async function buildPlan(plan: Plan, library: Library, seed?: number) {
  const slots = await generateFullPlan(plan, library, seed);
  await store.replaceSlots(plan.id, planDates(plan), slots);
  return slots;
}

/** Loads a plan's dinners, generating them the first time and repairing any that no longer fit. */
export async function ensurePlanSlots(plan: Plan, library: Library): Promise<MealSlot[]> {
  const slots = await store.getSlots(plan.id);
  if (!slots.length) return buildPlan(plan, library);
  return repairSlots(plan, slots, planLibrary(library, plan));
}

/**
 * Points slots at a replacement when their recipe has been removed, deleted or excluded, preferring
 * the recipe's named successor and otherwise the least-planned recipe that fits the slot and budget.
 */
async function repairSlots(plan: Plan, slots: MealSlot[], library: Library): Promise<MealSlot[]> {
  const broken = slots.filter((s) => !library.bySlug[s.recipeSlug]);
  if (!broken.length) return slots;

  const prices = await store.getPriceOverrides();
  const budget = plan.weeklyBudget;
  const counts = new Map<string, number>();
  for (const s of slots) counts.set(s.recipeSlug, (counts.get(s.recipeSlug) ?? 0) + 1);

  const repaired = slots.map((s) => ({ ...s }));
  for (const slot of repaired) {
    if (library.bySlug[slot.recipeSlug]) continue;
    const week = weekOf(plan, slot.date);
    const weekSlots = repaired.filter((s) => weekOf(plan, s.date) === week);
    const inWeek = new Set(weekSlots.map((s) => s.recipeSlug));
    const usable = (r: Recipe | undefined): r is Recipe =>
      !!r && fitsSlot(r, slot.role, slot.date) && !inWeek.has(r.slug);
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
    await store.setSlotRecipe(plan.id, slot.date, pick.slug);
  }
  return repaired;
}

/** Regenerates the given weeks (0-based), keeping the rest of the plan for variety checks. */
export async function regenerateWeeks(plan: Plan, weeks: number[], library: Library, seed = Date.now()) {
  const [existing, prices] = await Promise.all([store.getSlots(plan.id), store.getPriceOverrides()]);
  const fresh = generatePlan({ plan, weeks, existing, prices, seed, library: planLibrary(library, plan) });
  await store.replaceSlots(plan.id, weeks.flatMap((w) => weekDates(plan, w)), fresh);
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
