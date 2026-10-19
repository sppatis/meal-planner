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
