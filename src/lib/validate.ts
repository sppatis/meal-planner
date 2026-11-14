import { INGREDIENTS } from "@/data/ingredients";
import { RECIPES } from "@/data/recipes";
import { AIR_FRYER } from "@/data/recipes/air-fryer";
import { bannedAllergens } from "./allergens";
import { glutenIn } from "./celiac";
import { KCAL_CAP } from "./constants";
import { BUILTIN_LIBRARY } from "./library";
import { nutritionPerServing } from "./nutrition";
import type { Ingredient, IngredientMap, Recipe } from "./types";

/** Shellfish, nuts and other foods that stay out of the catalogue, including common hidden sources. */
const BANNED = [
  "prawn",
  "shrimp",
  "crab",
  "lobster",
  "mussel",
  "squid",
  "scallop",
  "oyster",
  "pesto",
  "pine nut",
  "satay",
  "peanut",
  "almond",
  "cashew",
  "walnut",
  "hazelnut",
  "pecan",
  "pistachio",
  "macadamia",
  "brazil nut",
  "marzipan",
  "praline",
  "nutella",
  "korma",
  "coconut",
  "thai curry paste",
  "nut oil",
];

/** Fish is allowed only when an ingredient is marked with the fish allergen. */
const FISH_WORDS = [
  "anchov\\w*",
  "salmon",
  "tuna",
  "cod",
  "haddock",
  "mackerel",
  "sardines?",
  "trout",
  "pollock",
  "plaice",
  "hake",
  "kippers?",
  "worcester\\w*",
  "sea ?bass",
  "fish\\w*",
];

const bannedRe = new RegExp(`\\b(${BANNED.join("|")})`, "i");
const fishRe = new RegExp(`\\b(${FISH_WORDS.join("|")})\\b`, "i");

export function allergenMatch(text: string) {
  return text.match(bannedRe)?.[0];
}

export function fishMatch(text: string) {
  return text.match(fishRe)?.[0];
}

export function ingredientProblems(ing: Ingredient): string[] {
  const problems: string[] = [];
  const banned = bannedAllergens(ing.allergens);
  if (banned.length) problems.push(`${ing.name} contains ${banned.join(", ")}`);
  const match = allergenMatch(ing.name);
  if (match) problems.push(`${ing.name} looks like it contains shellfish or nuts ("${match}")`);
  const fish = fishMatch(ing.name);
  if (fish && !ing.allergens?.includes("fish")) {
    problems.push(`${ing.name} looks like fish ("${fish}") but is not marked with the fish allergen`);
  }
  return problems;
}

export function recipeProblems(recipe: Recipe, ingredients: IngredientMap = INGREDIENTS): string[] {
  const problems: string[] = [];
  const text = [
    recipe.name,
    recipe.description,
    recipe.tip ?? "",
    ...recipe.steps,
    ...(recipe.airFryer ?? []),
    ...recipe.ingredients.map((i) => i.note ?? ""),
  ].join(" ");
  const match = allergenMatch(text);
  if (match) problems.push(`mentions "${match}", which could mean shellfish or nuts`);
  const fish = fishMatch(text);
  const markedFish = recipe.ingredients.some((line) => ingredients[line.id]?.allergens?.includes("fish"));
  if (fish && !markedFish) problems.push(`mentions "${fish}" but no ingredient is marked as fish`);
  if (/\bfan\b/i.test(text)) problems.push("uses a fan oven temperature (we have a gas oven)");
  if (/\boven to \d+C(?! \/ Gas \d)/.test(text)) problems.push("has an oven temperature without a gas mark");

  for (const line of recipe.ingredients) {
    const ing = ingredients[line.id];
    if (!ing) problems.push(`uses unknown ingredient ${line.id}`);
    else problems.push(...ingredientProblems(ing));
    if (!(line.qty > 0)) problems.push(`has a non-positive quantity for ${ing?.name ?? line.id}`);
  }

  const { kcal } = nutritionPerServing(recipe, ingredients);
  if (kcal > KCAL_CAP) problems.push(`is ${kcal} kcal per serving (cap ${KCAL_CAP})`);
  if (recipe.celiacSafe) {
    const gluten = glutenIn(recipe, ingredients);
    if (gluten.length) {
      problems.push(`is marked celiac safe but uses ${gluten.map((i) => i.name).join(", ")}, which contain gluten`);
    }
  }
  return problems;
}

export function validateLibrary(): string[] {
  const problems: string[] = [];
  const slugs = new Set<string>();

  for (const ing of Object.values(INGREDIENTS)) {
    problems.push(...ingredientProblems(ing).map((p) => `Ingredient ${ing.id}: ${p}`));
  }

  for (const recipe of RECIPES) {
    if (slugs.has(recipe.slug)) problems.push(`Duplicate recipe slug ${recipe.slug}`);
    slugs.add(recipe.slug);
    problems.push(...recipeProblems(recipe).map((p) => `${recipe.slug} ${p}`));
  }
  for (const slug of Object.keys(AIR_FRYER)) {
    if (!slugs.has(slug)) problems.push(`Air fryer method for unknown recipe ${slug}`);
  }

  for (const recipe of BUILTIN_LIBRARY.recipes) {
    if (recipe.custom) continue;
    const gluten = glutenIn(recipe, INGREDIENTS);
    if (gluten.length && recipe.celiacSafe) {
      problems.push(`${recipe.slug} is marked celiac safe but uses gluten`);
    }
    if (!gluten.length && !recipe.celiacSafe) {
      problems.push(`${recipe.slug} has no gluten ingredients but is not marked celiac safe`);
    }
  }
  return problems;
}
