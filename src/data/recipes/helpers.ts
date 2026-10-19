import type { Category, Protein, Recipe, RecipeIngredient } from "@/lib/types";

type Line = [id: string, qty: number, note?: string];

interface RecipeInput {
  slug: string;
  name: string;
  protein: Protein;
  prep: number;
  cook: number;
  description: string;
  ingredients: Line[];
  steps: string[];
  tip?: string;
}

export function category(cat: Category) {
  return (input: RecipeInput): Recipe => ({
    slug: input.slug,
    name: input.name,
    category: cat,
    protein: input.protein,
    prepMins: input.prep,
    cookMins: input.cook,
    description: input.description,
    ingredients: input.ingredients.map(
      ([id, qty, note]): RecipeIngredient => (note ? { id, qty, note } : { id, qty }),
    ),
    steps: input.steps,
    tip: input.tip,
  });
}
