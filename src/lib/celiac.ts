import type { Ingredient, IngredientMap, Recipe } from "./types";

/** Ingredients in a recipe that contain gluten. Unknown ids are ignored. */
export function glutenIn(recipe: Pick<Recipe, "ingredients">, ingredients: IngredientMap): Ingredient[] {
  const seen = new Set<string>();
  const found: Ingredient[] = [];
  for (const line of recipe.ingredients) {
    const ing = ingredients[line.id];
    if (!ing?.containsGluten || seen.has(ing.id)) continue;
    seen.add(ing.id);
    found.push(ing);
  }
  return found;
}

/**
 * Built-in recipes with no gluten ingredient are confirmed celiac safe.
 * A household recipe keeps the flag only when it was saved that way and still has none.
 */
export function confirmCeliac(recipe: Recipe, ingredients: IngredientMap): Recipe {
  if (glutenIn(recipe, ingredients).length) {
    if (!recipe.celiacSafe) return recipe;
    const next = { ...recipe };
    delete next.celiacSafe;
    return next;
  }
  if (!recipe.custom && !recipe.celiacSafe) return { ...recipe, celiacSafe: true };
  return recipe;
}
