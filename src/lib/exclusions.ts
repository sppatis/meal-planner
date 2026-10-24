import type { Library } from "./library";
import type { IngredientMap, Plan, Recipe } from "./types";

/** Lower-cased, trimmed, with a trailing plural dropped so "mushrooms" also matches "mushroom". */
export function normaliseTerm(term: string) {
  const t = term.trim().toLowerCase().replace(/\s+/g, " ");
  if (t.length > 4 && t.endsWith("es") && /(ch|sh|x|o)es$/.test(t)) return t.slice(0, -2);
  if (t.length > 3 && t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1);
  return t;
}

/** The excluded term a recipe trips over, if any. */
export function excludedBy(recipe: Recipe, terms: string[], ingredients: IngredientMap): string | undefined {
  if (!terms.length) return undefined;
  const names = [
    recipe.name.toLowerCase(),
    ...recipe.ingredients.map((l) => {
      const ing = ingredients[l.id];
      return `${ing?.name ?? ""} ${l.id.replace(/-/g, " ")}`.toLowerCase();
    }),
  ];
  return terms.find((term) => {
    const t = normaliseTerm(term);
    if (!t) return false;
    // Match from the start of a word, so "pea" catches "peas" but not "chickpeas".
    const re = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
    return names.some((n) => re.test(n));
  });
}

/** The library restricted to recipes the plan allows. */
export function planLibrary(library: Library, plan: Pick<Plan, "excluded">): Library {
  if (!plan.excluded.length) return library;
  const recipes = library.recipes.filter((r) => !excludedBy(r, plan.excluded, library.ingredients));
  return { ...library, recipes, bySlug: Object.fromEntries(recipes.map((r) => [r.slug, r])) };
}
