import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { buildLibrary } from "./library";
import { ensurePlanSlots, loadPlans } from "./plan";
import { store } from "./store";
import type { Photo, Plan } from "./types";

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

export const loadPlanList = cache(async () => {
  await connection();
  return loadPlans();
});

/** A plan by id, or the active plan when no id is given. */
export async function findPlan(id?: string): Promise<Plan | undefined> {
  const { plans, active } = await loadPlanList();
  return id ? plans.find((p) => p.id === id) : active;
}

export async function loadAppData(plan?: Plan) {
  const library = await loadLibrary();
  const { active } = await loadPlanList();
  const current = plan ?? active;
  const [slots, ratings, manualFavourites, photos, prices] = await Promise.all([
    ensurePlanSlots(current, library),
    store.getRatings(),
    store.getFavourites(),
    store.getPhotos(),
    store.getPriceOverrides(),
  ]);

  // Your own recipes always show up as favourites in the Replace dialog.
  const favourites = new Set([...manualFavourites, ...library.recipes.filter((r) => r.custom).map((r) => r.slug)]);
  for (const [slug, stars] of Object.entries(ratings)) {
    if (stars >= FAVOURITE_MIN_STARS) favourites.add(slug);
  }

  const coverPhotos: Record<string, string> = {};
  for (const p of photos as Photo[]) coverPhotos[p.recipeSlug] ??= p.url;

  return {
    plan: current,
    isActive: current.id === active.id,
    library,
    slots,
    ratings,
    manualFavourites,
    favourites: [...favourites],
    coverPhotos,
    prices,
  };
}
