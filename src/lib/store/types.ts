import type { MealSlot, Photo } from "@/lib/types";

export interface Store {
  getSlots(): Promise<MealSlot[]>;
  /** Replace all slots whose dates fall within `dates` with `slots`. */
  replaceSlots(dates: string[], slots: MealSlot[]): Promise<void>;
  setSlotRecipe(date: string, recipeSlug: string): Promise<void>;

  getRatings(): Promise<Record<string, number>>;
  setRating(recipeSlug: string, stars: number): Promise<void>;

  getFavourites(): Promise<string[]>;
  setFavourite(recipeSlug: string, favourite: boolean): Promise<void>;

  getPhotos(recipeSlug?: string): Promise<Photo[]>;
  addPhoto(recipeSlug: string, file: File): Promise<Photo>;
  deletePhoto(id: string): Promise<void>;

  getPriceOverrides(): Promise<Record<string, number>>;
  setPriceOverride(ingredientId: string, price: number | null): Promise<void>;
}
