import type { PriceOverrides } from "./cost";
import type { Ingredient, IngredientMap } from "./types";

export interface Supermarket {
  id: string;
  name: string;
  /**
   * Rough price level against Tesco, from public monthly price comparisons.
   * Pack prices in the catalogue are Tesco estimates and get multiplied by this.
   */
  priceLevel: number;
  search: (query: string) => string;
}

export const STORES = [
  { id: "tesco", name: "Tesco", priceLevel: 1, search: (q: string) => `https://www.tesco.com/groceries/en-GB/search?query=${q}` },
  { id: "sainsburys", name: "Sainsbury's", priceLevel: 1.03, search: (q: string) => `https://www.sainsburys.co.uk/groceries/search?searchTerm=${q}` },
  { id: "asda", name: "Asda", priceLevel: 0.93, search: (q: string) => `https://www.asda.com/groceries/search/${q}` },
  { id: "aldi", name: "Aldi", priceLevel: 0.85, search: (q: string) => `https://www.aldi.co.uk/results?q=${q}` },
  { id: "lidl", name: "Lidl", priceLevel: 0.86, search: (q: string) => `https://www.lidl.co.uk/q/search?q=${q}` },
  { id: "morrisons", name: "Morrisons", priceLevel: 1.02, search: (q: string) => `https://groceries.morrisons.com/search?q=${q}` },
  { id: "waitrose", name: "Waitrose", priceLevel: 1.2, search: (q: string) => `https://www.waitrose.com/ecom/shop/search?searchTerm=${q}` },
  { id: "coop", name: "Co-op", priceLevel: 1.15, search: (q: string) => `https://shop.coop.co.uk/search?term=${q}` },
  { id: "mands", name: "M&S", priceLevel: 1.2, search: (q: string) => `https://www.marksandspencer.com/search?searchTerm=${q}` },
] as const satisfies readonly Supermarket[];

export type StoreId = (typeof STORES)[number]["id"];

export const DEFAULT_STORE: StoreId = "tesco";

const BY_ID = new Map<string, Supermarket>(STORES.map((s) => [s.id, s]));

export function isStoreId(value: unknown): value is StoreId {
  return typeof value === "string" && BY_ID.has(value);
}

export function storeById(id: string): Supermarket {
  return BY_ID.get(id) ?? BY_ID.get(DEFAULT_STORE)!;
}

export function storeName(id: string) {
  return storeById(id).name;
}

/**
 * Estimated pack price at a store, before any correction for that store. It's worked out from Tesco's
 * price, using Tesco's correction when there is one since that's a real shelf price.
 */
export function estimatedPrice(ing: Ingredient, store: StoreId, tescoCorrections: PriceOverrides = {}) {
  const tesco = tescoCorrections[ing.id] ?? ing.packPrice;
  const level = storeById(store).priceLevel;
  return level === 1 ? ing.packPrice : Math.round(tesco * level * 100) / 100;
}

/** A price for every ingredient at a store: the store's correction if saved, otherwise the estimate. */
export function effectivePrices(
  ingredients: IngredientMap,
  store: StoreId,
  corrections: PriceOverrides = {},
  tescoCorrections: PriceOverrides = {},
): PriceOverrides {
  const prices: PriceOverrides = {};
  for (const ing of Object.values(ingredients)) {
    prices[ing.id] = corrections[ing.id] ?? estimatedPrice(ing, store, tescoCorrections);
  }
  return prices;
}

export function storeSearchUrl(store: StoreId, ing: Ingredient) {
  const name = ing.name.replace(/\s*\(.*\)/, "");
  const query = store === "tesco" ? `Tesco ${name}` : name;
  return storeById(store).search(encodeURIComponent(query));
}
