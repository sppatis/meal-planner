import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { requireHousehold } from "./household";
import { SERVINGS } from "./constants";
import { scaledLibrary } from "./exclusions";
import { buildLibrary } from "./library";
import { ensurePlanSlots, loadPlans, planPrices } from "./plan";
import { store } from "./store";
import { DEFAULT_STORE } from "./stores";
import type { MealSlot, Photo, Plan } from "./types";

export const FAVOURITE_MIN_STARS = 4;

/** Raw custom recipes and ingredients, as passed to the client library provider. */
export const loadCustom = cache(async () => {
  await connection();
  const [recipes, ingredients] = await Promise.all([store.getCustomRecipes(), store.getCustomIngredients()]);
  return { recipes, ingredients };
});

export const loadLibrary = cache(async () => {
  const { recipes, ingredients } = await loadCustom();
  return buildLibrary(recipes, ingredients);
});

/** The signed-in household with its store, plans and active plan. */
export const loadPlanList = cache(async () => {
  await connection();
  const household = await requireHousehold();
  const hs = store.forHousehold(household.id);
  return { household, hs, ...(await loadPlans(hs)) };
});

/** A plan by id, or the active plan when no id is given. */
export async function findPlan(id?: string): Promise<Plan | undefined> {
  const { plans, active } = await loadPlanList();
  return id ? plans.find((p) => p.id === id) : (active ?? undefined);
}

/** People and supermarket to show recipes for when the household has no plan yet. */
export const NO_PLAN_SETTINGS = { people: SERVINGS, store: DEFAULT_STORE } satisfies Pick<Plan, "people" | "store">;

/**
 * Everything the plan and recipe views need. The library is scaled to the plan's number of people
 * and prices are for its supermarket.
 */
export async function loadAppData(plan?: Plan) {
  const fullLibrary = await loadLibrary();
  const { hs, active } = await loadPlanList();
  const current = plan ?? active;
  const settings = current ?? NO_PLAN_SETTINGS;
  const [slots, ratings, manualFavourites, photos, prices] = await Promise.all([
    current ? ensurePlanSlots(hs, current, fullLibrary) : ([] as MealSlot[]),
    hs.getRatings(),
    hs.getFavourites(),
    store.getPhotos(),
    planPrices(settings, fullLibrary.ingredients),
  ]);
  const library = scaledLibrary(fullLibrary, settings.people);

  // Your own recipes always show up as favourites in the Replace dialog.
  const favourites = new Set([...manualFavourites, ...library.recipes.filter((r) => r.custom).map((r) => r.slug)]);
  for (const [slug, stars] of Object.entries(ratings)) {
    if (stars >= FAVOURITE_MIN_STARS) favourites.add(slug);
  }

  const coverPhotos: Record<string, string> = {};
  for (const p of photos as Photo[]) coverPhotos[p.recipeSlug] ??= p.url;

  return {
    plan: current,
    isActive: !!current && current.id === active?.id,
    library,
    slots,
    ratings,
    manualFavourites,
    favourites: [...favourites],
    coverPhotos,
    prices,
  };
}
