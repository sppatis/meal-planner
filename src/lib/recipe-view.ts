import { INGREDIENTS } from "@/data/ingredients";
import { SERVINGS } from "./constants";
import { formatQty, ingredientLine } from "./format";
import { nutritionPerServing } from "./nutrition";
import type { IngredientMap, Recipe } from "./types";

export function recipeLines(recipe: Recipe, ingredients: IngredientMap = INGREDIENTS) {
  return recipe.ingredients.map((line, i) => {
    const ing = ingredients[line.id];
    return {
      key: `${line.id}-${i}`,
      ingredient: ing,
      qty: line.qty,
      note: line.note,
      qtyText: formatQty(ing, line.qty),
      text: ingredientLine(ing, line.qty, line.note),
    };
  });
}

export function nutritionText(recipe: Recipe, ingredients: IngredientMap = INGREDIENTS) {
  const n = nutritionPerServing(recipe, ingredients);
  return [
    `${recipe.name}: 1 serving (recipe makes ${SERVINGS})`,
    `Calories: ${n.kcal} kcal`,
    `Protein: ${n.protein} g`,
    `Carbs: ${n.carbs} g`,
    `Fat: ${n.fat} g`,
    `Fibre: ${n.fibre} g`,
  ].join("\n");
}
