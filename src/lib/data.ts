import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { buildLibrary } from "./library";
import { ensurePlan } from "./plan";
import { store } from "./store";
import type { Photo } from "./types";

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

export async function loadAppData() {
  const library = await loadLibrary();
  const [slots, ratings, manualFavourites, photos, prices] = await Promise.all([
    ensurePlan(library),
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

  return { library, slots, ratings, manualFavourites, favourites: [...favourites], coverPhotos, prices };
}
