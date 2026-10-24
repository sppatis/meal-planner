import { ACTIVITIES } from "./constants";
import { weekCost, type PriceOverrides } from "./cost";
import { addDays, dayIndex, weekDates, weekOf, type PlanSpan } from "./dates";
import { BUILTIN_LIBRARY, type Library } from "./library";
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

export class PlanGenerationError extends Error {}

interface GenerateOptions {
  plan: PlanSpan & { weeklyBudget: number };
  /** Week indexes to (re)generate. Defaults to all weeks. */
  weeks?: number[];
  /** Existing slots; those outside `weeks` are kept and respected for variety. */
  existing?: MealSlot[];
  prices?: PriceOverrides;
  seed?: number;
  library?: Library;
}

export function generatePlan(opts: GenerateOptions): MealSlot[] {
  const { plan } = opts;
  const weeks = opts.weeks ?? Array.from({ length: plan.weeks }, (_, i) => i);
  const regenerate = new Set(weeks);
  const rng = mulberry32(opts.seed ?? 20261102);
  const library = opts.library ?? BUILTIN_LIBRARY;
  const ctx: WeekContext = { plan, byDate: new Map(), prices: opts.prices ?? {}, rng, library };
  const byDate = ctx.byDate;

  for (const slot of opts.existing ?? []) {
    const w = weekOf(plan, slot.date);
    if (w !== null && !regenerate.has(w) && library.bySlug[slot.recipeSlug]) byDate.set(slot.date, slot);
  }

  const generated: MealSlot[] = [];
  for (const week of [...weeks].sort((a, b) => a - b)) {
    const slots = generateWeek(week, ctx);
    for (const s of slots) byDate.set(s.date, s);
    generated.push(...slots);
  }
  return generated;
}

interface WeekContext {
  plan: PlanSpan & { weeklyBudget: number };
  byDate: Map<string, MealSlot>;
  prices: PriceOverrides;
  rng: Rng;
  library: Library;
}

function usedNear(plan: PlanSpan, week: number, window: number, byDate: Map<string, MealSlot>) {
  const used = new Set<string>();
  for (const slot of byDate.values()) {
    const w = weekOf(plan, slot.date);
    if (w !== null && w !== week && Math.abs(w - week) <= window) used.add(slot.recipeSlug);
  }
  return used;
}

function generateWeek(week: number, { plan, byDate, prices, rng, library }: WeekContext): MealSlot[] {
  const dates = weekDates(plan, week);
  const before = byDate.get(addDays(dates[0], -1));
  const after = byDate.get(addDays(dates[6], 1));
  let cheapest: { slots: MealSlot[]; cost: number } | null = null;

  // Last resort for heavily restricted plans: allow repeats from nearby weeks and more of one category.
  const passes = [...VARIETY_WINDOWS.map((w) => ({ window: w, maxPerCategory: MAX_PER_CATEGORY })), { window: 0, maxPerCategory: 7 }];
  for (const { window, maxPerCategory } of passes) {
    if (cheapest && maxPerCategory !== MAX_PER_CATEGORY) break;
    const recent = usedNear(plan, week, window, byDate);
    for (let attempt = 0; attempt < ATTEMPTS_PER_WINDOW; attempt++) {
      const slots = tryWeek(dates, recent, before, after, rng, library, maxPerCategory);
      if (!slots) continue;
      const cost = weekCost(
        slots.map((s) => library.bySlug[s.recipeSlug]),
        prices,
        library.ingredients,
      );
      if (cost <= plan.weeklyBudget) return slots;
      if (!cheapest || cost < cheapest.cost) cheapest = { slots, cost };
    }
  }
  if (cheapest) return cheapest.slots;
  throw new PlanGenerationError(
    `Couldn't fit 7 different dinners into week ${week + 1}. Try leaving out fewer ingredients.`,
  );
}

function tryWeek(
  dates: string[],
  recent: Set<string>,
  before: MealSlot | undefined,
  after: MealSlot | undefined,
  rng: Rng,
  library: Library,
  maxPerCategory: number,
): MealSlot[] | null {
  // Categories with no recipes left (e.g. everything with rice excluded) become "mix it up" nights.
  const has = (c: Category) => library.recipes.some((r) => r.category === c);
  const fakeawayDay = rng() < 0.5 ? 4 : 5;
  const roles = shuffle<SlotRole>(["rice", "pasta", "potato", "veggie", "extra", "extra"], rng).map((r) =>
    r === "extra" || has(r as Category) ? r : "extra",
  );
  const used = new Set<string>();
  const perCategory = new Map<Category, number>();
  const slots: MealSlot[] = [];
  let prev = before ? library.bySlug[before.recipeSlug] : undefined;

  for (let day = 0; day < 7; day++) {
    const date = dates[day];
    const role: SlotRole = day === fakeawayDay ? (has("fakeaway") ? "fakeaway" : "extra") : roles.shift()!;
    const quickNight = isQuickNight(date);
    const next = day === 6 && after ? library.bySlug[after.recipeSlug] : undefined;

    const candidates = library.recipes.filter(
      (r) =>
        fitsSlot(r, role, date) &&
        !used.has(r.slug) &&
        !recent.has(r.slug) &&
        (perCategory.get(r.category) ?? 0) < maxPerCategory &&
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
