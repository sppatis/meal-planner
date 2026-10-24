import type { Recipe } from "@/lib/types";
import { AIR_FRYER } from "./air-fryer";
import { FAKEAWAY } from "./fakeaway";
import { OTHER } from "./other";
import { PASTA } from "./pasta";
import { POTATO } from "./potato";
import { RICE } from "./rice";
import { VEGGIE } from "./veggie";

export const RECIPES: Recipe[] = [...RICE, ...PASTA, ...POTATO, ...VEGGIE, ...FAKEAWAY, ...OTHER].map((r) =>
  AIR_FRYER[r.slug] ? { ...r, airFryer: AIR_FRYER[r.slug] } : r,
);

export const RECIPES_BY_SLUG: Record<string, Recipe> = Object.fromEntries(
  RECIPES.map((r) => [r.slug, r]),
);

/** Removed recipes and what replaces them in an existing plan, keeping the same slot type and quick-night fit. */
export const RETIRED_RECIPES: Record<string, string> = {
  "chicken-mushroom-risotto": "lemon-herb-chicken-pilaf",
  "creamy-chicken-mushroom-pasta": "lemon-garlic-chicken-spaghetti",
  "chickpea-spinach-curry": "sweet-chilli-halloumi-bowls",
  "mushroom-stroganoff": "mexican-bean-jackets",
  "spanish-tortilla": "veg-feta-pasta-bake",
  "turkey-chilli-rice": "beef-chilli-rice",
  "turkey-meatball-pasta-bake": "beef-meatball-pasta-bake",
  "turkey-tacos": "beef-tacos",
};
