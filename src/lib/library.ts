import { INGREDIENTS } from "@/data/ingredients";
import { RECIPES } from "@/data/recipes";
import { confirmCeliac } from "./celiac";
import type { Ingredient, IngredientMap, Recipe } from "./types";

/** Built-in recipes and ingredients plus the household's own. */
export interface Library {
  recipes: Recipe[];
  bySlug: Record<string, Recipe>;
  ingredients: IngredientMap;
}

/** Prefix for slugs and ids created in the app, so they can never clash with built-ins. */
export const CUSTOM_PREFIX = "my-";

export function buildLibrary(customRecipes: Recipe[] = [], customIngredients: Ingredient[] = []): Library {
  const ingredients = { ...INGREDIENTS, ...Object.fromEntries(customIngredients.map((i) => [i.id, { ...i, custom: true }])) };
  const recipes = [...RECIPES, ...customRecipes.map((r) => ({ ...r, custom: true }))].map((r) =>
    confirmCeliac(r, ingredients),
  );
  return {
    recipes,
    bySlug: Object.fromEntries(recipes.map((r) => [r.slug, r])),
    ingredients,
  };
}

export const BUILTIN_LIBRARY = buildLibrary();

export function slugify(text: string) {
  return (
    CUSTOM_PREFIX +
    (text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "recipe")
  );
}
