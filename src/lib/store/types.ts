import type { StoreId } from "@/lib/stores";
import type { Ingredient, MealSlot, Photo, Plan, Recipe } from "@/lib/types";

/** The household that owns everything saved before households existed. */
export const HOME_HOUSEHOLD = "home";

export interface Household {
  id: string;
  name: string;
  /** scrypt hash of the passcode, or null if it hasn't been set. */
  passcodeHash: string | null;
  /** Bumped when the passcode is reset, which signs the household's devices out. */
  sessionVersion: number;
  createdAt: string;
}

/** Data that belongs to one household. Every method is scoped to the household the store was created for. */
export interface HouseholdStore {
  readonly householdId: string;

  getPlans(): Promise<Plan[]>;
  savePlan(plan: Plan): Promise<void>;
  /** Deletes the plan and its dinners. */
  deletePlan(id: string): Promise<void>;
  getActivePlanId(): Promise<string | null>;
  /** Pass null to clear the active plan so the homepage shows the start CTA. */
  setActivePlanId(id: string | null): Promise<void>;

  getSlots(planId: string): Promise<MealSlot[]>;
  /** Replace the plan's slots whose dates fall within `dates` with `slots`. */
  replaceSlots(planId: string, dates: string[], slots: MealSlot[]): Promise<void>;
  setSlotRecipe(planId: string, date: string, recipeSlug: string): Promise<void>;

  getRatings(): Promise<Record<string, number>>;
  setRating(recipeSlug: string, stars: number): Promise<void>;

  getFavourites(): Promise<string[]>;
  setFavourite(recipeSlug: string, favourite: boolean): Promise<void>;

  /** Recipe slugs this household has turned off for planning. */
  getHiddenRecipes(): Promise<string[]>;
  setRecipeHidden(recipeSlug: string, hidden: boolean): Promise<void>;
}

/** Data shared by every household, plus the households themselves. */
export interface Store {
  forHousehold(householdId: string): HouseholdStore;

  listHouseholds(): Promise<Household[]>;
  getHousehold(id: string): Promise<Household | null>;
  saveHousehold(household: Household): Promise<void>;
  /** Deletes the household with its plans, dinners, ratings and favourites. */
  deleteHousehold(id: string): Promise<void>;

  getPhotos(recipeSlug?: string): Promise<Photo[]>;
  addPhoto(recipeSlug: string, file: File): Promise<Photo>;
  deletePhoto(id: string): Promise<void>;

  /** Corrected pack prices at one supermarket, by ingredient id. */
  getPriceOverrides(store: StoreId): Promise<Record<string, number>>;
  setPriceOverride(store: StoreId, ingredientId: string, price: number | null): Promise<void>;

  getCustomRecipes(): Promise<Recipe[]>;
  saveCustomRecipe(recipe: Recipe): Promise<void>;
  deleteCustomRecipe(slug: string): Promise<void>;

  getCustomIngredients(): Promise<Ingredient[]>;
  saveCustomIngredient(ingredient: Ingredient): Promise<void>;
}
