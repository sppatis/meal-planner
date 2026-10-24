import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { DEFAULT_PLAN } from "@/lib/constants";
import type { Ingredient, MealSlot, Photo, Plan, Recipe } from "@/lib/types";
import type { Store } from "./types";

type StoredSlot = MealSlot & { planId: string };

interface LocalDb {
  plans: Plan[];
  activePlanId: string | null;
  slots: StoredSlot[];
  ratings: Record<string, number>;
  favourites: string[];
  photos: Photo[];
  prices: Record<string, number>;
  customRecipes: Recipe[];
  customIngredients: Ingredient[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");
export const LOCAL_PHOTO_DIR = path.join(DATA_DIR, "photos");

const empty = (): LocalDb => ({
  plans: [],
  activePlanId: null,
  slots: [],
  ratings: {},
  favourites: [],
  photos: [],
  prices: {},
  customRecipes: [],
  customIngredients: [],
});

async function read(): Promise<LocalDb> {
  let text: string;
  try {
    text = await fs.readFile(DB_FILE, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return empty();
    throw error;
  }
  // Any other failure must throw: falling back to empty() here would let the next write wipe the file.
  const db: LocalDb = { ...empty(), ...JSON.parse(text) };
  // Dinners saved before plans existed belong to the original plan.
  for (const s of db.slots) s.planId ??= DEFAULT_PLAN.id;
  return db;
}

async function write(db: LocalDb) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2));
  await fs.rename(tmp, DB_FILE);
}

let queue: Promise<unknown> = Promise.resolve();

function update(fn: (db: LocalDb) => void): Promise<void> {
  const run = queue.then(async () => {
    const db = await read();
    fn(db);
    await write(db);
  });
  queue = run.catch(() => {});
  return run;
}

export const localStore: Store = {
  async getPlans() {
    return (await read()).plans.sort((a, b) => a.startDate.localeCompare(b.startDate));
  },
  async savePlan(plan) {
    await update((db) => {
      db.plans = [...db.plans.filter((p) => p.id !== plan.id), plan];
    });
  },
  async deletePlan(id) {
    await update((db) => {
      db.plans = db.plans.filter((p) => p.id !== id);
      db.slots = db.slots.filter((s) => s.planId !== id);
      if (db.activePlanId === id) db.activePlanId = null;
    });
  },
  async getActivePlanId() {
    return (await read()).activePlanId;
  },
  async setActivePlanId(id) {
    await update((db) => {
      db.activePlanId = id;
    });
  },

  async getSlots(planId) {
    return (await read()).slots
      .filter((s) => s.planId === planId)
      .map(({ date, role, recipeSlug }) => ({ date, role, recipeSlug }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },
  async replaceSlots(planId, dates, slots) {
    const drop = new Set(dates);
    await update((db) => {
      db.slots = [
        ...db.slots.filter((s) => s.planId !== planId || !drop.has(s.date)),
        ...slots.map((s) => ({ ...s, planId })),
      ];
    });
  },
  async setSlotRecipe(planId, date, recipeSlug) {
    await update((db) => {
      const slot = db.slots.find((s) => s.planId === planId && s.date === date);
      if (slot) slot.recipeSlug = recipeSlug;
    });
  },

  async getRatings() {
    return (await read()).ratings;
  },
  async setRating(recipeSlug, stars) {
    await update((db) => {
      db.ratings[recipeSlug] = stars;
    });
  },

  async getFavourites() {
    return (await read()).favourites;
  },
  async setFavourite(recipeSlug, favourite) {
    await update((db) => {
      db.favourites = db.favourites.filter((s) => s !== recipeSlug);
      if (favourite) db.favourites.push(recipeSlug);
    });
  },

  async getPhotos(recipeSlug) {
    const photos = (await read()).photos;
    return (recipeSlug ? photos.filter((p) => p.recipeSlug === recipeSlug) : photos).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  },
  async addPhoto(recipeSlug, file) {
    const id = randomUUID();
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const fileName = `${id}.${ext}`;
    await fs.mkdir(LOCAL_PHOTO_DIR, { recursive: true });
    await fs.writeFile(path.join(LOCAL_PHOTO_DIR, fileName), Buffer.from(await file.arrayBuffer()));
    const photo: Photo = {
      id,
      recipeSlug,
      url: `/api/photos/${fileName}`,
      createdAt: new Date().toISOString(),
    };
    await update((db) => {
      db.photos.push(photo);
    });
    return photo;
  },
  async deletePhoto(id) {
    const photo = (await read()).photos.find((p) => p.id === id);
    if (!photo) return;
    await fs.rm(path.join(LOCAL_PHOTO_DIR, path.basename(photo.url)), { force: true });
    await update((db) => {
      db.photos = db.photos.filter((p) => p.id !== id);
    });
  },

  async getPriceOverrides() {
    return (await read()).prices;
  },
  async setPriceOverride(ingredientId, price) {
    await update((db) => {
      if (price === null) delete db.prices[ingredientId];
      else db.prices[ingredientId] = price;
    });
  },

  async getCustomRecipes() {
    return (await read()).customRecipes;
  },
  async saveCustomRecipe(recipe) {
    await update((db) => {
      db.customRecipes = [...db.customRecipes.filter((r) => r.slug !== recipe.slug), recipe];
    });
  },
  async deleteCustomRecipe(slug) {
    await update((db) => {
      db.customRecipes = db.customRecipes.filter((r) => r.slug !== slug);
    });
  },

  async getCustomIngredients() {
    return (await read()).customIngredients;
  },
  async saveCustomIngredient(ingredient) {
    await update((db) => {
      db.customIngredients = [...db.customIngredients.filter((i) => i.id !== ingredient.id), ingredient];
    });
  },
};
