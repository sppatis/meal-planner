import type { Ingredient } from "./types";

const FRACTIONS: Record<string, string> = { "0.25": "¼", "0.5": "½", "0.75": "¾" };

export function fraction(n: number): string {
  const whole = Math.floor(n);
  const rest = Math.round((n - whole) * 100) / 100;
  const frac = FRACTIONS[String(rest)];
  if (frac) return whole ? `${whole}${frac}` : frac;
  return String(Math.round(n * 10) / 10);
}

function pluralWord(word: string) {
  if (/(ch|sh|s|x|o)$/.test(word)) return `${word}es`;
  return `${word}s`;
}

export function plural(noun: string): string {
  const paren = noun.match(/^(.*?)( \(.*\))$/);
  if (paren) return plural(paren[1]) + paren[2];
  const of = noun.match(/^(.*?)( of .*)$/);
  if (of) return pluralWord(of[1]) + of[2];
  const words = noun.split(" ");
  words[words.length - 1] = pluralWord(words[words.length - 1]);
  return words.join(" ");
}

/** Human-friendly quantity, e.g. "450 g", "2 tins", "1½ peppers", "2 tsp". */
export function formatQty(ing: Ingredient, qty: number): string {
  if (ing.packNoun && qty >= ing.packSize && Math.abs(qty / ing.packSize - Math.round(qty / ing.packSize)) < 1e-6) {
    const count = Math.round(qty / ing.packSize);
    return `${count} ${count === 1 ? ing.packNoun : plural(ing.packNoun)}`;
  }
  switch (ing.unit) {
    case "g":
    case "ml":
      return qty >= 1000 && qty % 100 === 0 ? `${qty / 1000} ${ing.unit === "g" ? "kg" : "L"}` : `${Math.round(qty)} ${ing.unit}`;
    case "each": {
      const noun = ing.each ?? ing.name.toLowerCase();
      return `${fraction(qty)} ${qty > 1 ? plural(noun) : noun}`;
    }
    default:
      return `${fraction(qty)} ${ing.unit}`;
  }
}

/** Ingredient line in the plain form recipe importers like MyFitnessPal parse best. */
export function ingredientLine(ing: Ingredient, qty: number, note?: string): string {
  const q = formatQty(ing, qty);
  const base = ing.unit === "each" && !ing.packNoun ? q : `${q} ${ing.name.toLowerCase()}`;
  return note ? `${base}, ${note}` : base;
}
