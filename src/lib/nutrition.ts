import { INGREDIENTS } from "@/data/ingredients";
import { QUICK_MAX_MINS, SERVINGS } from "./constants";
import type { Ingredient, IngredientMap, Nutrition, Recipe } from "./types";

function factor(ing: Ingredient, qty: number) {
  return ing.unit === "g" || ing.unit === "ml" ? qty / 100 : qty;
}

/** Nutrition for one of the 3 servings. */
export function nutritionPerServing(recipe: Recipe, ingredients: IngredientMap = INGREDIENTS): Nutrition {
  const total: Nutrition = { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 };
  for (const line of recipe.ingredients) {
    const ing = ingredients[line.id];
    if (!ing) continue;
    const f = factor(ing, line.qty);
    total.kcal += ing.per.kcal * f;
    total.protein += ing.per.protein * f;
    total.carbs += ing.per.carbs * f;
    total.fat += ing.per.fat * f;
    total.fibre += ing.per.fibre * f;
  }
  return {
    kcal: Math.round(total.kcal / SERVINGS),
    protein: Math.round(total.protein / SERVINGS),
    carbs: Math.round(total.carbs / SERVINGS),
    fat: Math.round(total.fat / SERVINGS),
    fibre: Math.round(total.fibre / SERVINGS),
  };
}

export function totalMins(recipe: Recipe) {
  return recipe.prepMins + recipe.cookMins;
}

export function isQuick(recipe: Recipe) {
  return totalMins(recipe) <= QUICK_MAX_MINS;
}
