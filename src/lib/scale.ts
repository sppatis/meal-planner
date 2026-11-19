import { SERVINGS } from "./constants";
import type { IngredientMap, Recipe, Unit } from "./types";

export const MIN_PEOPLE = 1;
export const MAX_PEOPLE = 10;

const STEP: Record<Unit, number> = { each: 0.5, tsp: 0.25, tbsp: 0.25, g: 5, ml: 5 };

function roundQty(qty: number, unit: Unit) {
  const step = STEP[unit];
  const rounded = Math.round(qty / step) * step;
  if (rounded > 0) return rounded;
  // Never round an ingredient away: tiny weights keep a gram, everything else its smallest step.
  return unit === "g" || unit === "ml" ? Math.max(1, Math.round(qty)) : step;
}

export function recipeServings(recipe: Recipe) {
  return recipe.servings ?? SERVINGS;
}

/** The recipe with quantities for `people`. Recipes are written for 3. */
export function scaleRecipe(recipe: Recipe, people: number, ingredients: IngredientMap): Recipe {
  const from = recipeServings(recipe);
  if (people === from) return recipe;
  const factor = people / from;
  return {
    ...recipe,
    servings: people,
    ingredients: recipe.ingredients.map((line) => {
      const unit = ingredients[line.id]?.unit ?? "g";
      return { ...line, qty: roundQty(line.qty * factor, unit) };
    }),
  };
}

/**
 * A quantity shown for `people` back to a recipe written for `from` servings.
 * This divides by the factor scaleRecipe multiplied by. Display rounding stays in
 * scaleRecipe, so saving the amount on screen and opening the same plan shows it again.
 */
export function unscaleQty(qty: number, people: number, from: number): number {
  if (!(from > 0) || people === from) return qty;
  return Math.round(((qty * from) / people) * 1000) / 1000;
}
