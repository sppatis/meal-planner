import { RECIPES, RECIPES_BY_SLUG } from "@/data/recipes";
import { ACTIVITIES, PLAN_WEEKS, WEEKLY_BUDGET } from "./constants";
import { weekCost, type PriceOverrides } from "./cost";
import { addDays, dayIndex, weekDates, weekOf } from "./dates";
import { isQuick } from "./nutrition";
import type { Category, MealSlot, Recipe, SlotRole } from "./types";

/** Recipes can't come back within this many weeks either side. Relaxed if no plan fits. */
const VARIETY_WINDOWS = [3, 2, 1];
const ATTEMPTS_PER_WINDOW = 400;
const MAX_PER_CATEGORY = 2;
const MEAT_PROTEINS = new Set(["chicken", "beef", "pork", "turkey", "lamb"]);

export function isQuickNight(date: string) {
  return dayIndex(date) in ACTIVITIES;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;

function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function weightedPick<T>(items: { item: T; weight: number }[], rng: Rng): T | undefined {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rng() * total;
  for (const i of items) {
    r -= i.weight;
    if (r <= 0) return i.item;
  }
  return items.at(-1)?.item;
}

/** Recipes allowed in a slot, ignoring variety rules. Used by the generator and the swap dialog. */
export function fitsSlot(recipe: Recipe, role: SlotRole, date: string) {
  if (isQuickNight(date) && !isQuick(recipe)) return false;
  if (role === "fakeaway") return recipe.category === "fakeaway";
  if (role === "extra") return recipe.category !== "fakeaway";
  return recipe.category === (role as Category);
}

function clashesProtein(a: Recipe | undefined, b: Recipe | undefined) {
  return !!a && !!b && a.protein === b.protein && MEAT_PROTEINS.has(a.protein);
}

interface GenerateOptions {
  /** Week indexes to (re)generate. Defaults to all weeks. */
  weeks?: number[];
  /** Existing slots; those outside `weeks` are kept and respected for variety. */
  existing?: MealSlot[];
  prices?: PriceOverrides;
  seed?: number;
  budget?: number;
}

export function generatePlan(opts: GenerateOptions = {}): MealSlot[] {
  const weeks = opts.weeks ?? Array.from({ length: PLAN_WEEKS }, (_, i) => i);
  const regenerate = new Set(weeks);
  const budget = opts.budget ?? WEEKLY_BUDGET;
  const rng = mulberry32(opts.seed ?? 20261102);

  const byDate = new Map<string, MealSlot>();
  for (const slot of opts.existing ?? []) {
    const w = weekOf(slot.date);
    if (w !== null && !regenerate.has(w) && RECIPES_BY_SLUG[slot.recipeSlug]) byDate.set(slot.date, slot);
  }

  const generated: MealSlot[] = [];
  for (const week of [...weeks].sort((a, b) => a - b)) {
    const slots = generateWeek(week, byDate, opts.prices ?? {}, budget, rng);
    for (const s of slots) byDate.set(s.date, s);
    generated.push(...slots);
  }
  return generated;
}

function usedNear(week: number, window: number, byDate: Map<string, MealSlot>) {
  const used = new Set<string>();
  for (const slot of byDate.values()) {
    const w = weekOf(slot.date);
    if (w !== null && w !== week && Math.abs(w - week) <= window) used.add(slot.recipeSlug);
  }
  return used;
}

function generateWeek(
  week: number,
  byDate: Map<string, MealSlot>,
  prices: PriceOverrides,
  budget: number,
  rng: Rng,
): MealSlot[] {
  const dates = weekDates(week);
  const before = byDate.get(addDays(dates[0], -1));
  const after = byDate.get(addDays(dates[6], 1));
  let cheapest: { slots: MealSlot[]; cost: number } | null = null;

  for (const window of VARIETY_WINDOWS) {
    const recent = usedNear(week, window, byDate);
    for (let attempt = 0; attempt < ATTEMPTS_PER_WINDOW; attempt++) {
      const slots = tryWeek(dates, recent, before, after, rng);
      if (!slots) continue;
      const cost = weekCost(slots.map((s) => RECIPES_BY_SLUG[s.recipeSlug]), prices);
      if (cost <= budget) return slots;
      if (!cheapest || cost < cheapest.cost) cheapest = { slots, cost };
    }
  }
  if (cheapest) return cheapest.slots;
  throw new Error(`Could not build a plan for week ${week + 1}`);
}

function tryWeek(
  dates: string[],
  recent: Set<string>,
  before: MealSlot | undefined,
  after: MealSlot | undefined,
  rng: Rng,
): MealSlot[] | null {
  const fakeawayDay = rng() < 0.5 ? 4 : 5;
  const roles = shuffle<SlotRole>(["rice", "pasta", "potato", "veggie", "extra", "extra"], rng);
  const used = new Set<string>();
  const perCategory = new Map<Category, number>();
  const slots: MealSlot[] = [];
  let prev = before ? RECIPES_BY_SLUG[before.recipeSlug] : undefined;

  for (let day = 0; day < 7; day++) {
    const date = dates[day];
    const role: SlotRole = day === fakeawayDay ? "fakeaway" : roles.shift()!;
    const quickNight = isQuickNight(date);
    const next = day === 6 && after ? RECIPES_BY_SLUG[after.recipeSlug] : undefined;

    const candidates = RECIPES.filter(
      (r) =>
        fitsSlot(r, role, date) &&
        !used.has(r.slug) &&
        !recent.has(r.slug) &&
        (perCategory.get(r.category) ?? 0) < MAX_PER_CATEGORY &&
        !clashesProtein(prev, r) &&
        !clashesProtein(r, next),
    ).map((r) => ({
      item: r,
      // Keep quick recipes for quick nights, and lean extras towards "mix it up" dishes.
      weight: (!quickNight && isQuick(r) ? 0.5 : 1) * (role === "extra" && r.category === "other" ? 3 : 1),
    }));

    const pick = weightedPick(candidates, rng);
    if (!pick) return null;
    used.add(pick.slug);
    perCategory.set(pick.category, (perCategory.get(pick.category) ?? 0) + 1);
    slots.push({ date, role, recipeSlug: pick.slug });
    prev = pick;
  }
  return slots;
}
