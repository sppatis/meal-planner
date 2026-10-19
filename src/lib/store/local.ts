import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { MealSlot, Photo } from "@/lib/types";
import type { Store } from "./types";

interface LocalDb {
  slots: MealSlot[];
  ratings: Record<string, number>;
  favourites: string[];
  photos: Photo[];
  prices: Record<string, number>;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");
export const LOCAL_PHOTO_DIR = path.join(DATA_DIR, "photos");

const empty = (): LocalDb => ({ slots: [], ratings: {}, favourites: [], photos: [], prices: {} });

async function read(): Promise<LocalDb> {
  try {
    return { ...empty(), ...JSON.parse(await fs.readFile(DB_FILE, "utf8")) };
  } catch {
    return empty();
  }
}

async function write(db: LocalDb) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
}

async function update(fn: (db: LocalDb) => void) {
  const db = await read();
  fn(db);
  await write(db);
}

export const localStore: Store = {
  async getSlots() {
    return (await read()).slots.sort((a, b) => a.date.localeCompare(b.date));
  },
  async replaceSlots(dates, slots) {
    const drop = new Set(dates);
    await update((db) => {
      db.slots = [...db.slots.filter((s) => !drop.has(s.date)), ...slots];
    });
  },
  async setSlotRecipe(date, recipeSlug) {
    await update((db) => {
      const slot = db.slots.find((s) => s.date === date);
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
    const db = await read();
    const photo = db.photos.find((p) => p.id === id);
    if (!photo) return;
    await fs.rm(path.join(LOCAL_PHOTO_DIR, path.basename(photo.url)), { force: true });
    db.photos = db.photos.filter((p) => p.id !== id);
    await write(db);
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
};
