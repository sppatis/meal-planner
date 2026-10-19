import { INGREDIENTS } from "@/data/ingredients";
import type { Aisle, Ingredient, Recipe } from "./types";

export type PriceOverrides = Record<string, number>;

export function priceOf(ing: Ingredient, overrides: PriceOverrides = {}) {
  return overrides[ing.id] ?? ing.packPrice;
}

/** Share of pack prices actually used by one recipe (all 3 servings). */
export function recipeCost(recipe: Recipe, overrides: PriceOverrides = {}) {
  let cost = 0;
  for (const line of recipe.ingredients) {
    const ing = INGREDIENTS[line.id];
    if (ing) cost += (line.qty / ing.packSize) * priceOf(ing, overrides);
  }
  return cost;
}

export interface ShoppingLine {
  ingredient: Ingredient;
  qty: number;
  /** Packs to buy this week; null for cupboard staples. */
  packs: number | null;
  cost: number;
  usedIn: string[];
}

export interface ShoppingList {
  lines: ShoppingLine[];
  freshTotal: number;
  stapleTotal: number;
  total: number;
}

/**
 * Fresh items are costed in whole packs. Cupboard staples (rice, pasta, spices, sauces)
 * last for weeks, so only the share used this week is counted.
 */
export function shoppingList(recipes: Recipe[], overrides: PriceOverrides = {}): ShoppingList {
  const byId = new Map<string, { qty: number; usedIn: Set<string> }>();
  for (const recipe of recipes) {
    for (const line of recipe.ingredients) {
      const entry = byId.get(line.id) ?? { qty: 0, usedIn: new Set<string>() };
      entry.qty += line.qty;
      entry.usedIn.add(recipe.name);
      byId.set(line.id, entry);
    }
  }

  const lines: ShoppingLine[] = [];
  let freshTotal = 0;
  let stapleTotal = 0;
  for (const [id, { qty, usedIn }] of byId) {
    const ingredient = INGREDIENTS[id];
    if (!ingredient) continue;
    const price = priceOf(ingredient, overrides);
    if (ingredient.staple) {
      const cost = (qty / ingredient.packSize) * price;
      stapleTotal += cost;
      lines.push({ ingredient, qty, packs: null, cost, usedIn: [...usedIn] });
    } else {
      const packs = Math.ceil(qty / ingredient.packSize - 1e-9);
      const cost = packs * price;
      freshTotal += cost;
      lines.push({ ingredient, qty, packs, cost, usedIn: [...usedIn] });
    }
  }
  return { lines, freshTotal, stapleTotal, total: freshTotal + stapleTotal };
}

export function weekCost(recipes: Recipe[], overrides: PriceOverrides = {}) {
  return shoppingList(recipes, overrides).total;
}

export const AISLE_ORDER: Aisle[] = [
  "Meat & poultry",
  "Fruit & veg",
  "Dairy & eggs",
  "Bakery",
  "Frozen",
  "Tins & jars",
  "Cupboard",
];

export function tescoSearchUrl(ing: Ingredient) {
  return `https://www.tesco.com/groceries/en-GB/search?query=${encodeURIComponent(`Tesco ${ing.name.replace(/\s*\(.*\)/, "")}`)}`;
}

export function gbp(n: number) {
  return `£${n.toFixed(2)}`;
}
