import { RETIRED_RECIPES } from "@/data/recipes";
import { PLAN_WEEKS, WEEKLY_BUDGET } from "./constants";
import { weekCost } from "./cost";
import { weekDates, weekOf } from "./dates";
import { fitsSlot, generatePlan } from "./generator";
import type { Library } from "./library";
import { store } from "./store";
import type { MealSlot, Recipe } from "./types";

/** Loads the plan, generating and saving all 20 weeks the first time. */
export async function ensurePlan(library: Library): Promise<MealSlot[]> {
  const slots = await store.getSlots();
  if (slots.length) return repairSlots(slots, library);
  const prices = await store.getPriceOverrides();
  const plan = generatePlan({ prices, library });
  const dates = Array.from({ length: PLAN_WEEKS }, (_, w) => weekDates(w)).flat();
  await store.replaceSlots(dates, plan);
  return plan;
}

/**
 * Points slots at a replacement when their recipe has been removed or deleted, preferring the
 * recipe's named successor and otherwise the least-planned recipe that fits the slot and budget.
 */
async function repairSlots(slots: MealSlot[], library: Library): Promise<MealSlot[]> {
  const broken = slots.filter((s) => !library.bySlug[s.recipeSlug]);
  if (!broken.length) return slots;

  const prices = await store.getPriceOverrides();
  const counts = new Map<string, number>();
  for (const s of slots) counts.set(s.recipeSlug, (counts.get(s.recipeSlug) ?? 0) + 1);

  const repaired = slots.map((s) => ({ ...s }));
  for (const slot of repaired) {
    if (library.bySlug[slot.recipeSlug]) continue;
    const week = weekOf(slot.date);
    const weekSlots = repaired.filter((s) => weekOf(s.date) === week);
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
          Number(a.cost > WEEKLY_BUDGET) - Number(b.cost > WEEKLY_BUDGET) ||
          (a.cost > WEEKLY_BUDGET ? a.cost - b.cost : 0) ||
          (counts.get(a.r.slug) ?? 0) - (counts.get(b.r.slug) ?? 0) ||
          a.r.slug.localeCompare(b.r.slug),
      );
    const pick =
      usable(successor) && costWith(successor) <= WEEKLY_BUDGET ? successor : (options[0]?.r ?? (usable(successor) ? successor : undefined));
    if (!pick) continue;

    counts.set(pick.slug, (counts.get(pick.slug) ?? 0) + 1);
    slot.recipeSlug = pick.slug;
    await store.setSlotRecipe(slot.date, pick.slug);
  }
  return repaired;
}

/** Regenerates the given weeks (0-based), keeping the rest of the plan for variety checks. */
export async function regenerateWeeks(weeks: number[], library: Library, seed = Date.now()) {
  const [existing, prices] = await Promise.all([store.getSlots(), store.getPriceOverrides()]);
  const fresh = generatePlan({ weeks, existing, prices, seed, library });
  await store.replaceSlots(weeks.flatMap(weekDates), fresh);
  return fresh;
}

export function groupByWeek(slots: MealSlot[], library: Library) {
  const weeks: MealSlot[][] = Array.from({ length: PLAN_WEEKS }, () => []);
  for (const slot of slots) {
    const w = weekOf(slot.date);
    if (w !== null && library.bySlug[slot.recipeSlug]) weeks[w].push(slot);
  }
  for (const w of weeks) w.sort((a, b) => a.date.localeCompare(b.date));
  return weeks;
}
