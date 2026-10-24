"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { CATEGORY_LABELS, MAX_PLAN_WEEKS } from "@/lib/constants";
import { AISLE_ORDER } from "@/lib/cost";
import { findPlan, loadLibrary } from "@/lib/data";
import { mondayOf, parseISO, planDates, weekOf } from "@/lib/dates";
import { normaliseTerm } from "@/lib/exclusions";
import { PlanGenerationError } from "@/lib/generator";
import { buildLibrary, CUSTOM_PREFIX, slugify } from "@/lib/library";
import { ensurePlanSlots, generateFullPlan, loadPlans, regenerateWeeks } from "@/lib/plan";
import { store } from "@/lib/store";
import type { Aisle, Category, Ingredient, MealSlot, Plan, Protein, Recipe, Unit } from "@/lib/types";
import { ingredientProblems, recipeProblems } from "@/lib/validate";

function refreshAll() {
  revalidatePath("/", "layout");
}

async function assertRecipe(slug: string) {
  if (!(await loadLibrary()).bySlug[slug]) throw new Error(`Unknown recipe ${slug}`);
}

async function requirePlan(planId: string) {
  const plan = await findPlan(planId);
  if (!plan) throw new Error("Unknown plan");
  return plan;
}

export async function replaceSlot(planId: string, date: string, recipeSlug: string) {
  await requireAuth();
  const plan = await requirePlan(planId);
  await assertRecipe(recipeSlug);
  if (weekOf(plan, date) === null) throw new Error("Date is outside the plan");
  await store.setSlotRecipe(plan.id, date, recipeSlug);
  refreshAll();
}

export async function regenerateWeek(planId: string, week: number) {
  await requireAuth();
  const plan = await requirePlan(planId);
  if (!(Number.isInteger(week) && week >= 0 && week < plan.weeks)) throw new Error("Invalid week");
  await regenerateWeeks(plan, [week], await loadLibrary());
  refreshAll();
}

export async function setActivePlan(planId: string) {
  await requireAuth();
  await requirePlan(planId);
  await store.setActivePlanId(planId);
  refreshAll();
}

export async function deletePlan(planId: string) {
  await requireAuth();
  const { plans, active } = await loadPlans();
  if (!plans.some((p) => p.id === planId)) throw new Error("Unknown plan");
  if (active.id === planId) throw new Error("Make another plan active before deleting this one");
  await store.deletePlan(planId);
  refreshAll();
}

export interface PlanDraft {
  /** Set when editing. */
  id?: string;
  title: string;
  startDate: string;
  weeks: number;
  weeklyBudget: number;
  excluded: string[];
  quickDays: number[];
  makeActive: boolean;
  /** Rebuild every dinner. Always happens for new plans or when the dates change. */
  rebuild: boolean;
}

export type SavePlanResult = { ok: true; id: string; active: boolean } | { ok: false; errors: string[] };

export async function savePlan(draft: PlanDraft): Promise<SavePlanResult> {
  await requireAuth();
  const errors: string[] = [];
  const { plans, active } = await loadPlans();
  const existing = draft.id ? plans.find((p) => p.id === draft.id) : undefined;
  if (draft.id && !existing) return { ok: false, errors: ["That plan no longer exists"] };

  const title = text(draft.title, 60);
  const startDate = typeof draft.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(draft.startDate) ? draft.startDate : "";
  const weeks = Math.round(num(draft.weeks));
  const weeklyBudget = Math.round(num(draft.weeklyBudget) * 100) / 100;
  const excluded = [
    ...new Map(
      (Array.isArray(draft.excluded) ? draft.excluded : [])
        .map((t) => text(t, 40))
        .filter((t) => t.length >= 2)
        .map((t) => [normaliseTerm(t), t] as const),
    ).values(),
  ].slice(0, 40);
  const quickDays = [
    ...new Set((Array.isArray(draft.quickDays) ? draft.quickDays : []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)),
  ].sort((a, b) => a - b);

  if (title.length < 2) errors.push("Give the plan a title");
  if (!startDate || Number.isNaN(parseISO(startDate).getTime())) errors.push("Choose a start date");
  if (!(weeks >= 1 && weeks <= MAX_PLAN_WEEKS)) errors.push(`The plan can run for 1 to ${MAX_PLAN_WEEKS} weeks`);
  if (!(weeklyBudget >= 10 && weeklyBudget <= 500)) errors.push("Set a weekly budget between £10 and £500");
  if (errors.length) return { ok: false, errors };

  let id = existing?.id;
  if (!id) {
    const base = slugify(title).slice(CUSTOM_PREFIX.length) || "plan";
    id = base;
    for (let i = 2; plans.some((p) => p.id === id); i++) id = `${base}-${i}`;
  }
  const plan: Plan = {
    id,
    title,
    startDate: mondayOf(startDate),
    weeks,
    weeklyBudget,
    excluded,
    quickDays,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };

  const library = await loadLibrary();
  const rebuild = !existing || existing.startDate !== plan.startDate || existing.weeks !== plan.weeks || draft.rebuild;
  let slots: MealSlot[] | null = null;
  if (rebuild) {
    try {
      slots = await generateFullPlan(plan, library);
    } catch (err) {
      if (err instanceof PlanGenerationError) return { ok: false, errors: [err.message] };
      throw err;
    }
  }
  await store.savePlan(plan);
  if (slots) {
    const dates = new Set([...planDates(plan), ...(existing ? planDates(existing) : [])]);
    await store.replaceSlots(plan.id, [...dates], slots);
  } else {
    // Keep the dinners and only swap out ones that are now excluded or too slow for a quick night.
    await ensurePlanSlots(plan, library);
  }
  const makeActive = draft.makeActive || active.id === plan.id;
  if (makeActive) await store.setActivePlanId(plan.id);
  refreshAll();
  return { ok: true, id: plan.id, active: makeActive };
}

export async function setRating(recipeSlug: string, stars: number) {
  await requireAuth();
  await assertRecipe(recipeSlug);
  if (!(Number.isInteger(stars) && stars >= 1 && stars <= 5)) throw new Error("Rating must be 1-5");
  await store.setRating(recipeSlug, stars);
  refreshAll();
}

export async function setFavourite(recipeSlug: string, favourite: boolean) {
  await requireAuth();
  await assertRecipe(recipeSlug);
  await store.setFavourite(recipeSlug, favourite);
  refreshAll();
}

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

export async function uploadPhoto(formData: FormData) {
  await requireAuth();
  const recipeSlug = String(formData.get("recipeSlug"));
  const file = formData.get("photo");
  await assertRecipe(recipeSlug);
  if (!(file instanceof File) || !file.type.startsWith("image/")) throw new Error("Please choose an image");
  if (file.size > MAX_PHOTO_BYTES) throw new Error("Image is too large");
  await store.addPhoto(recipeSlug, file);
  refreshAll();
}

export async function deletePhoto(id: string) {
  await requireAuth();
  await store.deletePhoto(id);
  refreshAll();
}

export async function setPrice(ingredientId: string, price: number | null) {
  await requireAuth();
  if (!(await loadLibrary()).ingredients[ingredientId]) throw new Error("Unknown ingredient");
  if (price !== null && !(Number.isFinite(price) && price >= 0 && price < 100)) throw new Error("Invalid price");
  await store.setPriceOverride(ingredientId, price === null ? null : Math.round(price * 100) / 100);
  refreshAll();
}

export interface RecipeDraft {
  /** Set when editing an existing custom recipe. */
  slug?: string;
  name: string;
  category: Category;
  protein: Protein;
  prepMins: number;
  cookMins: number;
  description: string;
  ingredients: { id: string; qty: number; note?: string }[];
  /** Ingredients created in the form that aren't in the catalogue yet. */
  newIngredients: Ingredient[];
  steps: string[];
  tip?: string;
  airFryer?: string[];
}

export type SaveRecipeResult = { ok: true; slug: string } | { ok: false; errors: string[] };

const UNITS: Unit[] = ["g", "ml", "each", "tsp", "tbsp"];
const PROTEINS: Protein[] = ["chicken", "beef", "pork", "turkey", "lamb", "egg", "veggie"];

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : NaN);
const lines = (v: unknown, max: number) =>
  (Array.isArray(v) ? v : []).map((s) => text(s, 600)).filter(Boolean).slice(0, max);

function cleanIngredient(raw: Ingredient, errors: string[]): Ingredient | null {
  const name = text(raw.name, 60);
  const label = name || "A new ingredient";
  const per = raw.per ?? {};
  const ing: Ingredient = {
    id: text(raw.id, 70),
    name,
    unit: raw.unit,
    packSize: num(raw.packSize),
    packPrice: Math.round(num(raw.packPrice) * 100) / 100,
    packLabel: text(raw.packLabel, 30),
    aisle: raw.aisle,
    staple: raw.staple === true || undefined,
    per: {
      kcal: num(per.kcal),
      protein: num(per.protein),
      carbs: num(per.carbs),
      fat: num(per.fat),
      fibre: num(per.fibre) || 0,
    },
    each: raw.unit === "each" ? text(raw.each, 40) || name.toLowerCase() : undefined,
    custom: true,
  };
  if (!ing.id.startsWith(CUSTOM_PREFIX)) errors.push(`${label} has an invalid id`);
  if (name.length < 2) errors.push("Every new ingredient needs a name");
  if (!UNITS.includes(ing.unit)) errors.push(`${label} needs a unit`);
  if (!AISLE_ORDER.includes(ing.aisle as Aisle)) errors.push(`${label} needs an aisle`);
  if (!(ing.packSize > 0)) errors.push(`${label} needs a pack size`);
  if (!(ing.packPrice >= 0 && ing.packPrice < 100)) errors.push(`${label} needs a pack price under £100`);
  if (!ing.packLabel) ing.packLabel = `${ing.packSize}${ing.unit === "each" ? "" : ing.unit}`;
  const { kcal, protein, carbs, fat, fibre } = ing.per;
  if (![kcal, protein, carbs, fat, fibre].every((v) => v >= 0 && v < 2000)) {
    errors.push(`${label} needs calories, protein, carbs and fat (0 if none)`);
  }
  errors.push(...ingredientProblems(ing));
  return errors.length ? null : ing;
}

export async function saveRecipe(draft: RecipeDraft): Promise<SaveRecipeResult> {
  await requireAuth();
  const errors: string[] = [];
  const library = await loadLibrary();

  const existing = draft.slug ? library.bySlug[draft.slug] : undefined;
  if (draft.slug && !existing?.custom) return { ok: false, errors: ["Only your own recipes can be edited"] };

  const newIngredients: Ingredient[] = [];
  for (const raw of (draft.newIngredients ?? []).slice(0, 30)) {
    const ingErrors: string[] = [];
    const ing = cleanIngredient(raw, ingErrors);
    errors.push(...ingErrors);
    if (ing) newIngredients.push(ing);
  }
  const withNew = buildLibrary(
    library.recipes.filter((r) => r.custom),
    [...Object.values(library.ingredients).filter((i) => i.custom), ...newIngredients],
  );

  const name = text(draft.name, 80);
  const recipe: Recipe = {
    slug: existing?.slug ?? "",
    name,
    category: draft.category,
    protein: draft.protein,
    prepMins: Math.round(num(draft.prepMins)),
    cookMins: Math.round(num(draft.cookMins)),
    description: text(draft.description, 300),
    ingredients: (Array.isArray(draft.ingredients) ? draft.ingredients : []).slice(0, 40).map((l) => ({
      id: text(l.id, 70),
      qty: num(l.qty),
      ...(text(l.note, 60) ? { note: text(l.note, 60) } : {}),
    })),
    steps: lines(draft.steps, 20),
    ...(text(draft.tip, 400) ? { tip: text(draft.tip, 400) } : {}),
    ...(lines(draft.airFryer, 10).length ? { airFryer: lines(draft.airFryer, 10) } : {}),
    custom: true,
  };

  if (name.length < 3) errors.push("Give the recipe a name");
  if (!(recipe.category in CATEGORY_LABELS)) errors.push("Choose a type of dinner");
  if (!PROTEINS.includes(recipe.protein)) errors.push("Choose the main protein");
  if (!(recipe.prepMins >= 0 && recipe.prepMins <= 300)) errors.push("Prep time should be 0-300 minutes");
  if (!(recipe.cookMins >= 0 && recipe.cookMins <= 600)) errors.push("Cook time should be 0-600 minutes");
  if (!recipe.ingredients.length) errors.push("Add at least one ingredient");
  if (!recipe.steps.length) errors.push("Add at least one method step");
  if (!errors.length) errors.push(...recipeProblems(recipe, withNew.ingredients).map((p) => `This recipe ${p}`));
  if (errors.length) return { ok: false, errors: [...new Set(errors)] };

  if (!existing) {
    const base = slugify(name);
    let slug = base;
    for (let i = 2; library.bySlug[slug]; i++) slug = `${base}-${i}`;
    recipe.slug = slug;
  }

  const used = new Set(recipe.ingredients.map((l) => l.id));
  for (const ing of newIngredients) if (used.has(ing.id)) await store.saveCustomIngredient(ing);
  await store.saveCustomRecipe(recipe);
  refreshAll();
  return { ok: true, slug: recipe.slug };
}

export async function deleteRecipe(slug: string) {
  await requireAuth();
  const library = await loadLibrary();
  if (!library.bySlug[slug]?.custom) throw new Error("Only your own recipes can be deleted");
  await store.deleteCustomRecipe(slug);
  const [recipes, ingredients, { plans }] = await Promise.all([
    store.getCustomRecipes(),
    store.getCustomIngredients(),
    loadPlans(),
  ]);
  const remaining = buildLibrary(recipes, ingredients);
  for (const plan of plans) await ensurePlanSlots(plan, remaining);
  refreshAll();
}
