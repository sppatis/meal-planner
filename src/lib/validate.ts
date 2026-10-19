import { INGREDIENTS } from "@/data/ingredients";
import { RECIPES } from "@/data/recipes";
import { AIR_FRYER } from "@/data/recipes/air-fryer";
import { KCAL_CAP } from "./constants";
import { nutritionPerServing } from "./nutrition";

/** Words that indicate fish, shellfish or nuts, including common hidden sources. */
const BANNED = [
  "fish",
  "anchov",
  "worcester",
  "salmon",
  "tuna",
  "cod",
  "haddock",
  "mackerel",
  "sardine",
  "prawn",
  "shrimp",
  "crab",
  "lobster",
  "mussel",
  "squid",
  "scallop",
  "oyster",
  "caesar",
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

const bannedRe = new RegExp(`\\b(${BANNED.join("|")})`, "i");

export function validateLibrary(): string[] {
  const problems: string[] = [];
  const slugs = new Set<string>();

  for (const ing of Object.values(INGREDIENTS)) {
    if (ing.allergens?.length) problems.push(`Ingredient ${ing.id} has allergens: ${ing.allergens.join(", ")}`);
    if (bannedRe.test(ing.name)) problems.push(`Ingredient ${ing.id} name matches an allergen keyword`);
  }

  for (const recipe of RECIPES) {
    if (slugs.has(recipe.slug)) problems.push(`Duplicate recipe slug ${recipe.slug}`);
    slugs.add(recipe.slug);

    const text = [
      recipe.name,
      recipe.description,
      recipe.tip ?? "",
      ...recipe.steps,
      ...(recipe.airFryer ?? []),
      ...recipe.ingredients.map((i) => i.note ?? ""),
    ].join(" ");
    const match = text.match(bannedRe);
    if (match) problems.push(`${recipe.slug} mentions "${match[0]}"`);
    if (/\bfan\b/i.test(text)) problems.push(`${recipe.slug} uses a fan oven temperature (we have a gas oven)`);
    if (/\boven to \d+C(?! \/ Gas \d)/.test(text)) problems.push(`${recipe.slug} has an oven temperature without a gas mark`);

    for (const line of recipe.ingredients) {
      if (!INGREDIENTS[line.id]) problems.push(`${recipe.slug} uses unknown ingredient ${line.id}`);
      if (!(line.qty > 0)) problems.push(`${recipe.slug} has a non-positive quantity for ${line.id}`);
    }

    const { kcal } = nutritionPerServing(recipe);
    if (kcal > KCAL_CAP) problems.push(`${recipe.slug} is ${kcal} kcal per serving (cap ${KCAL_CAP})`);
  }
  for (const slug of Object.keys(AIR_FRYER)) {
    if (!slugs.has(slug)) problems.push(`Air fryer method for unknown recipe ${slug}`);
  }
  return problems;
}
