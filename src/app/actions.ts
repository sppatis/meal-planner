"use server";

import { revalidatePath } from "next/cache";
import { INGREDIENTS } from "@/data/ingredients";
import { RECIPES_BY_SLUG } from "@/data/recipes";
import { requireAuth } from "@/lib/auth";
import { PLAN_WEEKS } from "@/lib/constants";
import { weekOf } from "@/lib/dates";
import { regenerateWeeks } from "@/lib/plan";
import { store } from "@/lib/store";

function refreshAll() {
  revalidatePath("/", "layout");
}

function assertRecipe(slug: string) {
  if (!RECIPES_BY_SLUG[slug]) throw new Error(`Unknown recipe ${slug}`);
}

export async function replaceSlot(date: string, recipeSlug: string) {
  await requireAuth();
  assertRecipe(recipeSlug);
  if (weekOf(date) === null) throw new Error("Date is outside the plan");
  await store.setSlotRecipe(date, recipeSlug);
  refreshAll();
}

export async function regenerateWeek(week: number) {
  await requireAuth();
  if (!(Number.isInteger(week) && week >= 0 && week < PLAN_WEEKS)) throw new Error("Invalid week");
  await regenerateWeeks([week]);
  refreshAll();
}

export async function setRating(recipeSlug: string, stars: number) {
  await requireAuth();
  assertRecipe(recipeSlug);
  if (!(Number.isInteger(stars) && stars >= 1 && stars <= 5)) throw new Error("Rating must be 1-5");
  await store.setRating(recipeSlug, stars);
  refreshAll();
}

export async function setFavourite(recipeSlug: string, favourite: boolean) {
  await requireAuth();
  assertRecipe(recipeSlug);
  await store.setFavourite(recipeSlug, favourite);
  refreshAll();
}

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

export async function uploadPhoto(formData: FormData) {
  await requireAuth();
  const recipeSlug = String(formData.get("recipeSlug"));
  const file = formData.get("photo");
  assertRecipe(recipeSlug);
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
  if (!INGREDIENTS[ingredientId]) throw new Error("Unknown ingredient");
  if (price !== null && !(Number.isFinite(price) && price >= 0 && price < 100)) throw new Error("Invalid price");
  await store.setPriceOverride(ingredientId, price === null ? null : Math.round(price * 100) / 100);
  refreshAll();
}
