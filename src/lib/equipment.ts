import type { Equipment, Recipe } from "./types";

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  hob: "Gas hob",
  oven: "Gas oven",
  microwave: "Microwave",
  airFryer: "Ninja Dual Zone",
};

const PATTERNS: [Equipment, RegExp][] = [
  ["hob", /\b(pan|wok|boil|simmer|stir-fry|fry|frying|casserole|saucepan|griddle|scramble)\b/i],
  ["oven", /\b(oven|bake|roast)\b/i],
  ["microwave", /\b(microwave|rice pouches?|heat the rice)\b/i],
];

/** Equipment used by the main method, plus the Ninja when there's an air fryer method. */
export function equipmentFor(recipe: Recipe): Equipment[] {
  const text = recipe.steps.join(" ");
  const found = PATTERNS.filter(([, re]) => re.test(text)).map(([e]) => e);
  if (recipe.ingredients.some((i) => i.id === "microwave-rice") && !found.includes("microwave")) found.push("microwave");
  if (recipe.airFryer) found.push("airFryer");
  return found;
}
