import type { Ingredient, MealSlot, Photo, Plan, Recipe } from "@/lib/types";

export interface Store {
  getPlans(): Promise<Plan[]>;
  savePlan(plan: Plan): Promise<void>;
  /** Deletes the plan and its dinners. */
  deletePlan(id: string): Promise<void>;
  getActivePlanId(): Promise<string | null>;
  setActivePlanId(id: string): Promise<void>;

  getSlots(planId: string): Promise<MealSlot[]>;
  /** Replace the plan's slots whose dates fall within `dates` with `slots`. */
  replaceSlots(planId: string, dates: string[], slots: MealSlot[]): Promise<void>;
  setSlotRecipe(planId: string, date: string, recipeSlug: string): Promise<void>;

  getRatings(): Promise<Record<string, number>>;
  setRating(recipeSlug: string, stars: number): Promise<void>;

  getFavourites(): Promise<string[]>;
  setFavourite(recipeSlug: string, favourite: boolean): Promise<void>;

  getPhotos(recipeSlug?: string): Promise<Photo[]>;
  addPhoto(recipeSlug: string, file: File): Promise<Photo>;
  deletePhoto(id: string): Promise<void>;

  getPriceOverrides(): Promise<Record<string, number>>;
  setPriceOverride(ingredientId: string, price: number | null): Promise<void>;

  getCustomRecipes(): Promise<Recipe[]>;
  saveCustomRecipe(recipe: Recipe): Promise<void>;
  deleteCustomRecipe(slug: string): Promise<void>;

  getCustomIngredients(): Promise<Ingredient[]>;
  saveCustomIngredient(ingredient: Ingredient): Promise<void>;
}
