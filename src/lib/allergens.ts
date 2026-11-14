import type { Allergen, Ingredient, IngredientMap, Recipe } from "./types";

/** UK 14, in the order shown on the household page. */
export const ALLERGENS = [
  "celery",
  "gluten",
  "crustaceans",
  "eggs",
  "fish",
  "lupin",
  "milk",
  "molluscs",
  "mustard",
  "nuts",
  "peanuts",
  "sesame",
  "soya",
  "sulphites",
] as const satisfies readonly Allergen[];

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  celery: "Celery",
  gluten: "Gluten (coeliac)",
  crustaceans: "Crustaceans",
  eggs: "Eggs",
  fish: "Fish",
  lupin: "Lupin",
  milk: "Milk",
  molluscs: "Molluscs",
  mustard: "Mustard",
  nuts: "Tree nuts",
  peanuts: "Peanuts",
  sesame: "Sesame",
  soya: "Soya",
  sulphites: "Sulphites",
};

/** Still banned from the built-in catalogue and from household recipes. */
export const BANNED_ALLERGENS = ["fish", "crustaceans", "molluscs", "nuts", "peanuts"] as const satisfies readonly Allergen[];

const ALLERGEN_SET = new Set<string>(ALLERGENS);
const BANNED_SET = new Set<string>(BANNED_ALLERGENS);

export function isAllergen(value: unknown): value is Allergen {
  return typeof value === "string" && ALLERGEN_SET.has(value);
}

export function bannedAllergens(allergens: readonly Allergen[] | undefined): Allergen[] {
  return (allergens ?? []).filter((a) => BANNED_SET.has(a));
}

/** "gluten, milk and eggs" using the household labels, lower-cased. */
export function listAllergens(allergies: readonly Allergen[]) {
  const names = allergies.map((a) => ALLERGEN_LABELS[a].toLowerCase());
  if (names.length < 2) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** True when a recipe uses an ingredient carrying one of the selected allergens. */
export function blockedByAllergies(
  recipe: Pick<Recipe, "ingredients">,
  ingredients: IngredientMap,
  allergies: readonly Allergen[],
): boolean {
  if (!allergies.length) return false;
  const selected = new Set(allergies);
  for (const line of recipe.ingredients) {
    const ing = ingredients[line.id];
    if (!ing) continue;
    if (selected.has("gluten") && ing.containsGluten) return true;
    if (ing.allergens?.some((a) => selected.has(a))) return true;
  }
  return false;
}

/** Allergens to store on a custom ingredient, with gluten mirrored onto `containsGluten`. */
export function allergensOf(ingredient: Pick<Ingredient, "allergens" | "containsGluten">): Allergen[] {
  const found = new Set<Allergen>((ingredient.allergens ?? []).filter(isAllergen));
  if (ingredient.containsGluten) found.add("gluten");
  return ALLERGENS.filter((a) => found.has(a));
}
