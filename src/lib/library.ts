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

function savedBuiltIn(catalogue: Recipe, saved: Recipe): Recipe {
  const next: Recipe = { ...saved, slug: catalogue.slug };
  delete next.custom;
  delete next.servings;
  if (!next.note) delete next.note;
  return next;
}

function usableSaved(saved: Recipe): boolean {
  return (
    typeof saved.name === "string" &&
    typeof saved.category === "string" &&
    typeof saved.protein === "string" &&
    Array.isArray(saved.steps) &&
    saved.steps.length > 0 &&
    Array.isArray(saved.ingredients) &&
    saved.ingredients.length > 0 &&
    saved.ingredients.every((line) => typeof line?.id === "string" && typeof line.qty === "number" && line.qty > 0)
  );
}

/** Prefix for slugs and ids created in the app, so they can never clash with built-ins. */
export const CUSTOM_PREFIX = "my-";

export function buildLibrary(
  customRecipes: Recipe[] = [],
  customIngredients: Ingredient[] = [],
  savedRecipes: Recipe[] = [],
): Library {
  const ingredients = { ...INGREDIENTS, ...Object.fromEntries(customIngredients.map((i) => [i.id, { ...i, custom: true }])) };
  const savedBySlug = new Map<string, Recipe>();
  for (const saved of savedRecipes) {
    if (!saved || typeof saved.slug !== "string" || saved.slug.startsWith(CUSTOM_PREFIX) || !usableSaved(saved)) continue;
    savedBySlug.set(saved.slug, saved);
  }
  const recipes = [
    ...RECIPES.map((recipe) => {
      const saved = savedBySlug.get(recipe.slug);
      return saved ? savedBuiltIn(recipe, saved) : recipe;
    }),
    ...customRecipes.map((r) => ({ ...r, custom: true as const })),
  ].map((r) => confirmCeliac(r, ingredients));
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
