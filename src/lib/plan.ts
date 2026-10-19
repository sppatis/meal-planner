import { RECIPES_BY_SLUG } from "@/data/recipes";
import { PLAN_WEEKS } from "./constants";
import { weekDates, weekOf } from "./dates";
import { generatePlan } from "./generator";
import { store } from "./store";
import type { MealSlot } from "./types";

/** Loads the plan, generating and saving all 20 weeks the first time. */
export async function ensurePlan(): Promise<MealSlot[]> {
  const slots = await store.getSlots();
  if (slots.length) return slots;
  const prices = await store.getPriceOverrides();
  const plan = generatePlan({ prices });
  const dates = Array.from({ length: PLAN_WEEKS }, (_, w) => weekDates(w)).flat();
  await store.replaceSlots(dates, plan);
  return plan;
}

/** Regenerates the given weeks (0-based), keeping the rest of the plan for variety checks. */
export async function regenerateWeeks(weeks: number[], seed = Date.now()) {
  const [existing, prices] = await Promise.all([store.getSlots(), store.getPriceOverrides()]);
  const fresh = generatePlan({ weeks, existing, prices, seed });
  await store.replaceSlots(weeks.flatMap(weekDates), fresh);
  return fresh;
}

export function groupByWeek(slots: MealSlot[]) {
  const weeks: MealSlot[][] = Array.from({ length: PLAN_WEEKS }, () => []);
  for (const slot of slots) {
    const w = weekOf(slot.date);
    if (w !== null && RECIPES_BY_SLUG[slot.recipeSlug]) weeks[w].push(slot);
  }
  for (const w of weeks) w.sort((a, b) => a.date.localeCompare(b.date));
  return weeks;
}
