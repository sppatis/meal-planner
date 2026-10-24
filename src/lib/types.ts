export type Unit = "g" | "ml" | "each" | "tsp" | "tbsp";

export type Aisle =
  | "Meat & poultry"
  | "Fruit & veg"
  | "Dairy & eggs"
  | "Bakery"
  | "Frozen"
  | "Tins & jars"
  | "Cupboard";

export type Allergen = "fish" | "shellfish" | "nuts" | "peanuts";

export interface Nutrition {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: Unit;
  /** Size of one Tesco pack, in `unit`. */
  packSize: number;
  /** Estimated Tesco price for one pack, in pounds. */
  packPrice: number;
  packLabel: string;
  aisle: Aisle;
  /** Long-life items whose cost is spread across weeks rather than bought per week. */
  staple?: boolean;
  /** Nutrition per 100g/100ml, or per single item for each/tsp/tbsp units. */
  per: Nutrition;
  /** Singular noun used when the unit is "each" (e.g. "red pepper"). */
  each?: string;
  /** Shown when a recipe uses whole packs, e.g. "2 tins". */
  packNoun?: string;
  allergens?: Allergen[];
  /** Brand-dependent risk that should be checked on the label. */
  checkLabel?: string;
  /** Added by the household rather than built in. */
  custom?: boolean;
}

export type IngredientMap = Record<string, Ingredient>;

export type Category = "rice" | "pasta" | "potato" | "veggie" | "fakeaway" | "other";

export type Protein =
  | "chicken"
  | "beef"
  | "pork"
  | "turkey"
  | "lamb"
  | "egg"
  | "veggie";

export interface RecipeIngredient {
  id: string;
  /** Quantity for 3 servings, in the ingredient's unit. */
  qty: number;
  note?: string;
}

export interface Recipe {
  slug: string;
  name: string;
  category: Category;
  protein: Protein;
  prepMins: number;
  cookMins: number;
  description: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  /** Optional extra ideas, e.g. serving or prep-ahead tips. */
  tip?: string;
  /** Alternative steps for the Ninja Dual Zone air fryer. */
  airFryer?: string[];
  /** Added by the household rather than built in. */
  custom?: boolean;
}

export type Equipment = "hob" | "oven" | "microwave" | "airFryer";

/** The role a slot fills in the weekly mix. */
export type SlotRole = "rice" | "pasta" | "potato" | "veggie" | "fakeaway" | "extra";

export interface Plan {
  id: string;
  title: string;
  /** ISO date of the first Monday. */
  startDate: string;
  weeks: number;
  weeklyBudget: number;
  /** Words for ingredients to leave out, e.g. "mushroom". Matched against ingredient and recipe names. */
  excluded: string[];
  createdAt: string;
}

export interface MealSlot {
  /** ISO date YYYY-MM-DD */
  date: string;
  role: SlotRole;
  recipeSlug: string;
}

export interface Photo {
  id: string;
  recipeSlug: string;
  url: string;
  createdAt: string;
}
