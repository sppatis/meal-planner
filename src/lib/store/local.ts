import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { ORIGINAL_PLAN_ID } from "@/lib/constants";
import type { Ingredient, MealSlot, Photo, Plan, Recipe } from "@/lib/types";
import { photoUrl, removePhotoFile, savePhotoFile } from "./photo-files";
import { HOME_HOUSEHOLD, type Household, type HouseholdStore, type Store } from "./types";

type StoredPlan = Plan & { householdId: string };
type StoredSlot = MealSlot & { householdId: string; planId: string };

export interface LocalDb {
  households: Household[];
  plans: StoredPlan[];
  /** Active plan id by household. */
  activePlanIds: Record<string, string>;
  slots: StoredSlot[];
  /** Stars by household, then recipe. */
  ratings: Record<string, Record<string, number>>;
  /** Favourite recipe slugs by household. */
  favourites: Record<string, string[]>;
  photos: Photo[];
  /** Price corrections by supermarket, then ingredient. */
  prices: Record<string, Record<string, number>>;
  customRecipes: Recipe[];
  customIngredients: Ingredient[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const homeHousehold = (): Household => ({
  id: HOME_HOUSEHOLD,
  name: "Home",
  passcodeHash: null,
  sessionVersion: 1,
  createdAt: new Date(0).toISOString(),
});

/**
 * Reads any version of db.json. Files saved before households existed had one set of plans, ratings and
 * favourites, which now belong to the home household.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normaliseLocalDb(raw: any): LocalDb {
  const flatRatings = raw.ratings && Object.values(raw.ratings).some((v) => typeof v === "number");
  // Corrections saved before supermarkets were configurable were Tesco prices.
  const flatPrices = raw.prices && Object.values(raw.prices).some((v) => typeof v === "number");
  return {
    households: Array.isArray(raw.households) ? raw.households : [homeHousehold()],
    plans: (raw.plans ?? []).map((p: StoredPlan) => ({ ...p, householdId: p.householdId ?? HOME_HOUSEHOLD })),
    activePlanIds: raw.activePlanIds ?? (raw.activePlanId ? { [HOME_HOUSEHOLD]: raw.activePlanId } : {}),
    slots: (raw.slots ?? []).map((s: StoredSlot) => ({
      ...s,
      householdId: s.householdId ?? HOME_HOUSEHOLD,
      // Dinners saved before plans existed belong to the original plan.
      planId: s.planId ?? ORIGINAL_PLAN_ID,
    })),
    ratings: flatRatings ? { [HOME_HOUSEHOLD]: raw.ratings } : (raw.ratings ?? {}),
    favourites: Array.isArray(raw.favourites) ? { [HOME_HOUSEHOLD]: raw.favourites } : (raw.favourites ?? {}),
    photos: raw.photos ?? [],
    prices: flatPrices ? { tesco: raw.prices } : (raw.prices ?? {}),
    customRecipes: raw.customRecipes ?? [],
    customIngredients: raw.customIngredients ?? [],
  };
}

async function read(): Promise<LocalDb> {
  let text: string;
  try {
    text = await fs.readFile(DB_FILE, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return normaliseLocalDb({});
    throw error;
  }
  // Any other failure must throw: falling back to an empty database here would let the next write wipe the file.
  return normaliseLocalDb(JSON.parse(text));
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

function stripPlan(stored: StoredPlan): Plan {
  const plan: Partial<StoredPlan> = { ...stored };
  delete plan.householdId;
  return plan as Plan;
}

function householdStore(h: string): HouseholdStore {
  return {
    householdId: h,

    async getPlans() {
      return (await read()).plans
        .filter((p) => p.householdId === h)
        .map(stripPlan)
        .sort((a, b) => a.startDate.localeCompare(b.startDate));
    },
    async savePlan(plan) {
      await update((db) => {
        db.plans = [...db.plans.filter((p) => p.householdId !== h || p.id !== plan.id), { ...plan, householdId: h }];
      });
    },
    async deletePlan(id) {
      await update((db) => {
        db.plans = db.plans.filter((p) => p.householdId !== h || p.id !== id);
        db.slots = db.slots.filter((s) => s.householdId !== h || s.planId !== id);
        if (db.activePlanIds[h] === id) delete db.activePlanIds[h];
      });
    },
    async getActivePlanId() {
      return (await read()).activePlanIds[h] ?? null;
    },
    async setActivePlanId(id) {
      await update((db) => {
        db.activePlanIds[h] = id;
      });
    },

    async getSlots(planId) {
      return (await read()).slots
        .filter((s) => s.householdId === h && s.planId === planId)
        .map(({ date, role, recipeSlug }) => ({ date, role, recipeSlug }))
        .sort((a, b) => a.date.localeCompare(b.date));
    },
    async replaceSlots(planId, dates, slots) {
      const drop = new Set(dates);
      await update((db) => {
        db.slots = [
          ...db.slots.filter((s) => s.householdId !== h || s.planId !== planId || !drop.has(s.date)),
          ...slots.map((s) => ({ ...s, householdId: h, planId })),
        ];
      });
    },
    async setSlotRecipe(planId, date, recipeSlug) {
      await update((db) => {
        const slot = db.slots.find((s) => s.householdId === h && s.planId === planId && s.date === date);
        if (slot) slot.recipeSlug = recipeSlug;
      });
    },

    async getRatings() {
      return (await read()).ratings[h] ?? {};
    },
    async setRating(recipeSlug, stars) {
      await update((db) => {
        db.ratings[h] = { ...db.ratings[h], [recipeSlug]: stars };
      });
    },

    async getFavourites() {
      return (await read()).favourites[h] ?? [];
    },
    async setFavourite(recipeSlug, favourite) {
      await update((db) => {
        const list = (db.favourites[h] ?? []).filter((s) => s !== recipeSlug);
        db.favourites[h] = favourite ? [...list, recipeSlug] : list;
      });
    },
  };
}

export const localStore: Store = {
  forHousehold: householdStore,

  async listHouseholds() {
    return (await read()).households;
  },
  async getHousehold(id) {
    return (await read()).households.find((h) => h.id === id) ?? null;
  },
  async saveHousehold(household) {
    await update((db) => {
      const i = db.households.findIndex((h) => h.id === household.id);
      if (i >= 0) db.households[i] = { ...household, createdAt: db.households[i].createdAt };
      else db.households.push(household);
    });
  },
  async deleteHousehold(id) {
    await update((db) => {
      db.households = db.households.filter((h) => h.id !== id);
      db.plans = db.plans.filter((p) => p.householdId !== id);
      db.slots = db.slots.filter((s) => s.householdId !== id);
      delete db.activePlanIds[id];
      delete db.ratings[id];
      delete db.favourites[id];
    });
  },

  async getPhotos(recipeSlug) {
    const photos = (await read()).photos;
    return (recipeSlug ? photos.filter((p) => p.recipeSlug === recipeSlug) : photos).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  },
  async addPhoto(recipeSlug, file) {
    const { id, fileName } = await savePhotoFile(file);
    const photo: Photo = {
      id,
      recipeSlug,
      url: photoUrl(fileName),
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
    await removePhotoFile(photo.url);
    await update((db) => {
      db.photos = db.photos.filter((p) => p.id !== id);
    });
  },

  async getPriceOverrides(storeId) {
    return (await read()).prices[storeId] ?? {};
  },
  async setPriceOverride(storeId, ingredientId, price) {
    await update((db) => {
      const prices = (db.prices[storeId] ??= {});
      if (price === null) delete prices[ingredientId];
      else prices[ingredientId] = price;
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
