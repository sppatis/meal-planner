import "server-only";
import { connection } from "next/server";
import { ensurePlan } from "./plan";
import { store } from "./store";
import type { Photo } from "./types";

export const FAVOURITE_MIN_STARS = 4;

export async function loadAppData() {
  await connection();
  const [slots, ratings, manualFavourites, photos, prices] = await Promise.all([
    ensurePlan(),
    store.getRatings(),
    store.getFavourites(),
    store.getPhotos(),
    store.getPriceOverrides(),
  ]);

  const favourites = new Set(manualFavourites);
  for (const [slug, stars] of Object.entries(ratings)) {
    if (stars >= FAVOURITE_MIN_STARS) favourites.add(slug);
  }

  const coverPhotos: Record<string, string> = {};
  for (const p of photos as Photo[]) coverPhotos[p.recipeSlug] ??= p.url;

  return { slots, ratings, manualFavourites, favourites: [...favourites], coverPhotos, prices };
}
