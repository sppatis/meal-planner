"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { saveRecipe, type RecipeDraft } from "@/app/actions";
import { CATEGORY_LABELS, KCAL_CAP, QUICK_MAX_MINS, SERVINGS } from "@/lib/constants";
import { AISLE_ORDER, gbp, recipeCost } from "@/lib/cost";
import { slugify } from "@/lib/library";
import { nutritionPerServing } from "@/lib/nutrition";
import type { Aisle, Category, Ingredient, Protein, Recipe, Unit } from "@/lib/types";
import { recipeProblems } from "@/lib/validate";
import { useLibrary } from "./library-provider";

const PROTEIN_LABELS: Record<Protein, string> = {
  chicken: "Chicken",
  beef: "Beef",
  pork: "Pork",
  turkey: "Turkey",
  lamb: "Lamb",
  egg: "Egg",
  veggie: "Veggie (no meat)",
};

const UNIT_LABELS: Record<Unit, string> = {
  g: "grams (g)",
  ml: "millilitres (ml)",
  each: "items (each)",
  tsp: "teaspoons",
  tbsp: "tablespoons",
};

interface Row {
  key: number;
  id: string;
  qty: string;
  note: string;
}

interface NewIngredientFields {
  name: string;
  aisle: Aisle;
  unit: Unit;
  packSize: string;
  packPrice: string;
  packLabel: string;
  staple: boolean;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
  fibre: string;
}

const BLANK_INGREDIENT: NewIngredientFields = {
  name: "",
  aisle: "Fruit & veg",
  unit: "g",
  packSize: "",
  packPrice: "",
  packLabel: "",
  staple: false,
  kcal: "",
  protein: "",
  carbs: "",
  fat: "",
  fibre: "",
};

let nextKey = 1;
const toNum = (s: string) => (s.trim() === "" ? NaN : Number(s));
const field =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600";
const label = "mb-1 block text-xs font-semibold text-stone-600";

export function RecipeForm({ recipe }: { recipe?: Recipe }) {
  const router = useRouter();
  const library = useLibrary();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);

  const [name, setName] = useState(recipe?.name ?? "");
  const [description, setDescription] = useState(recipe?.description ?? "");
  const [category, setCategory] = useState<Category>(recipe?.category ?? "other");
  const [protein, setProtein] = useState<Protein>(recipe?.protein ?? "chicken");
  const [prep, setPrep] = useState(String(recipe?.prepMins ?? 10));
  const [cook, setCook] = useState(String(recipe?.cookMins ?? 20));
  const [rows, setRows] = useState<Row[]>(
    recipe?.ingredients.map((l) => ({ key: nextKey++, id: l.id, qty: String(l.qty), note: l.note ?? "" })) ?? [
      { key: nextKey++, id: "", qty: "", note: "" },
    ],
  );
  const [steps, setSteps] = useState(recipe?.steps.join("\n") ?? "");
  const [tip, setTip] = useState(recipe?.tip ?? "");
  const [airFryer, setAirFryer] = useState(recipe?.airFryer?.join("\n") ?? "");
  const [newIngredients, setNewIngredients] = useState<Ingredient[]>([]);
  const [creatingFor, setCreatingFor] = useState<number | null>(null);
  const [newIng, setNewIng] = useState<NewIngredientFields>(BLANK_INGREDIENT);
  const [newIngError, setNewIngError] = useState<string | null>(null);

  const ingredients = useMemo(
    () => ({ ...library.ingredients, ...Object.fromEntries(newIngredients.map((i) => [i.id, i])) }),
    [library, newIngredients],
  );
  const groups = useMemo(() => {
    const all = Object.values(ingredients);
    return AISLE_ORDER.map((aisle) => ({
      aisle,
      items: all.filter((i) => i.aisle === aisle).sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [ingredients]);

  const draft: RecipeDraft = {
    slug: recipe?.slug,
    name,
    category,
    protein,
    prepMins: toNum(prep),
    cookMins: toNum(cook),
    description,
    ingredients: rows.filter((r) => r.id).map((r) => ({ id: r.id, qty: toNum(r.qty), note: r.note || undefined })),
    newIngredients,
    steps: steps.split("\n").map((s) => s.trim()).filter(Boolean),
    tip: tip || undefined,
    airFryer: airFryer.split("\n").map((s) => s.trim()).filter(Boolean),
  };

  const preview: Recipe = { ...draft, slug: draft.slug ?? "preview", airFryer: draft.airFryer?.length ? draft.airFryer : undefined };
  const filled = { ...preview, ingredients: preview.ingredients.filter((l) => l.qty > 0) };
  const n = nutritionPerServing(filled, ingredients);
  const cost = recipeCost(filled, {}, ingredients);
  const total = (toNum(prep) || 0) + (toNum(cook) || 0);
  const warnings = name ? recipeProblems(preview, ingredients) : [];

  function updateRow(key: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addNewIngredient() {
    const f = newIng;
    const ing: Ingredient = {
      id: `${slugify(f.name)}-${Date.now().toString(36)}`,
      name: f.name.trim(),
      unit: f.unit,
      packSize: toNum(f.packSize),
      packPrice: toNum(f.packPrice),
      packLabel: f.packLabel.trim() || `${f.packSize}${f.unit === "each" ? "" : f.unit}`,
      aisle: f.aisle,
      staple: f.staple || undefined,
      per: {
        kcal: toNum(f.kcal),
        protein: toNum(f.protein),
        carbs: toNum(f.carbs),
        fat: toNum(f.fat),
        fibre: toNum(f.fibre) || 0,
      },
      each: f.unit === "each" ? f.name.trim().toLowerCase() : undefined,
      custom: true,
    };
    const { kcal, protein: p, carbs, fat } = ing.per;
    if (ing.name.length < 2) return setNewIngError("Give the ingredient a name.");
    if (!(ing.packSize > 0) || !(ing.packPrice >= 0)) return setNewIngError("Add the pack size and price.");
    if (![kcal, p, carbs, fat].every((v) => v >= 0)) {
      return setNewIngError("Add calories, protein, carbs and fat from the label (0 if none).");
    }
    setNewIngredients((list) => [...list, ing]);
    if (creatingFor !== null) updateRow(creatingFor, { id: ing.id });
    setCreatingFor(null);
    setNewIng(BLANK_INGREDIENT);
    setNewIngError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    startTransition(async () => {
      const res = await saveRecipe(draft);
      if (res.ok) router.push(`/recipe/${res.slug}`);
      else {
        setErrors(res.errors);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  const perLabel = newIng.unit === "g" ? "per 100g" : newIng.unit === "ml" ? "per 100ml" : `per ${newIng.unit === "each" ? "item" : newIng.unit}`;

  return (
    <form onSubmit={submit} className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-6">
        {errors.length > 0 && (
          <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200" role="alert">
            <p className="font-semibold">Please fix these before saving:</p>
            <ul className="mt-1 list-disc pl-5">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        <section className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-stone-200">
          <h2 className="font-bold">The basics</h2>
          <div>
            <label className={label} htmlFor="name">
              Recipe name
            </label>
            <input id="name" className={field} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className={label} htmlFor="description">
              Short description
            </label>
            <input
              id="description"
              className={field}
              value={description}
              placeholder="One line shown under the title"
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className={label} htmlFor="category">
                Type
              </label>
              <select id="category" className={field} value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="protein">
                Main protein
              </label>
              <select id="protein" className={field} value={protein} onChange={(e) => setProtein(e.target.value as Protein)}>
                {(Object.keys(PROTEIN_LABELS) as Protein[]).map((p) => (
                  <option key={p} value={p}>
                    {PROTEIN_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="prep">
                Prep (min)
              </label>
              <input id="prep" type="number" min={0} className={field} value={prep} onChange={(e) => setPrep(e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="cook">
                Cook (min)
              </label>
              <input id="cook" type="number" min={0} className={field} value={cook} onChange={(e) => setCook(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-stone-500">
            &quot;Mix it up&quot; dinners can go on any night. Recipes ready in {QUICK_MAX_MINS} minutes or less can be used on
            quick nights.
          </p>
        </section>

        <section className="rounded-2xl bg-white p-5 ring-1 ring-stone-200">
          <h2 className="font-bold">Ingredients for {SERVINGS}</h2>
          <p className="mt-1 text-xs text-stone-500">
            Pick from the Tesco catalogue so calories and prices work out automatically. If something&apos;s missing, add it
            as a new ingredient.
          </p>
          <ul className="mt-4 space-y-3">
            {rows.map((row) => {
              const ing = ingredients[row.id];
              return (
                <li key={row.key} className="grid grid-cols-[1fr_6rem_auto] gap-2 sm:grid-cols-[1fr_7rem_10rem_auto]">
                  <select
                    aria-label="Ingredient"
                    className={field}
                    value={row.id}
                    onChange={(e) => {
                      if (e.target.value === "__new") {
                        setCreatingFor(row.key);
                        setNewIng(BLANK_INGREDIENT);
                      } else updateRow(row.key, { id: e.target.value });
                    }}
                  >
                    <option value="">Choose an ingredient...</option>
                    <option value="__new">+ New ingredient...</option>
                    {groups.map((g) => (
                      <optgroup key={g.aisle} label={g.aisle}>
                        {g.items.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <div className="relative">
                    <input
                      aria-label="Quantity"
                      type="number"
                      min={0}
                      step="any"
                      className={`${field} pr-10`}
                      value={row.qty}
                      onChange={(e) => updateRow(row.key, { qty: e.target.value })}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-stone-400">
                      {ing ? (ing.unit === "each" ? "×" : ing.unit) : ""}
                    </span>
                  </div>
                  <input
                    aria-label="Note"
                    placeholder="e.g. diced"
                    className={`${field} col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto`}
                    value={row.note}
                    onChange={(e) => updateRow(row.key, { note: e.target.value })}
                  />
                  <button
                    type="button"
                    aria-label="Remove ingredient"
                    onClick={() => setRows((rs) => rs.filter((r) => r.key !== row.key))}
                    className="rounded-lg px-2 text-stone-400 hover:bg-stone-100 hover:text-rose-600"
                  >
                    ✕
                  </button>
                  {ing && (
                    <p className="col-span-full -mt-1 text-[11px] text-stone-400">
                      {ing.packLabel} pack · {gbp(ing.packPrice)}
                      {ing.unit === "g" || ing.unit === "ml" ? ` · ${ing.per.kcal} kcal per 100${ing.unit}` : ` · ${ing.per.kcal} kcal each`}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => setRows((rs) => [...rs, { key: nextKey++, id: "", qty: "", note: "" }])}
            className="mt-4 rounded-lg border border-dashed border-stone-300 px-3 py-2 text-sm font-medium text-stone-600 hover:border-emerald-600 hover:text-emerald-700"
          >
            + Add ingredient
          </button>

          {creatingFor !== null && (
            <div className="mt-5 space-y-3 rounded-xl bg-stone-50 p-4 ring-1 ring-stone-200">
              <h3 className="font-semibold">New ingredient</h3>
              <p className="text-xs text-stone-500">
                Copy the details from the Tesco website or the pack. Nutrition comes from the label&apos;s
                &quot;per 100g&quot; column (or per item for things counted individually).
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-3">
                  <label className={label} htmlFor="ni-name">
                    Name
                  </label>
                  <input id="ni-name" className={field} value={newIng.name} onChange={(e) => setNewIng({ ...newIng, name: e.target.value })} />
                </div>
                <div>
                  <label className={label} htmlFor="ni-aisle">
                    Aisle
                  </label>
                  <select id="ni-aisle" className={field} value={newIng.aisle} onChange={(e) => setNewIng({ ...newIng, aisle: e.target.value as Aisle })}>
                    {AISLE_ORDER.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={label} htmlFor="ni-unit">
                    Measured in
                  </label>
                  <select id="ni-unit" className={field} value={newIng.unit} onChange={(e) => setNewIng({ ...newIng, unit: e.target.value as Unit })}>
                    {(Object.keys(UNIT_LABELS) as Unit[]).map((u) => (
                      <option key={u} value={u}>
                        {UNIT_LABELS[u]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={label} htmlFor="ni-size">
                    Pack size ({newIng.unit === "each" ? "items" : newIng.unit})
                  </label>
                  <input id="ni-size" type="number" min={0} step="any" className={field} value={newIng.packSize} onChange={(e) => setNewIng({ ...newIng, packSize: e.target.value })} />
                </div>
                <div>
                  <label className={label} htmlFor="ni-price">
                    Pack price (£)
                  </label>
                  <input id="ni-price" type="number" min={0} step="0.01" className={field} value={newIng.packPrice} onChange={(e) => setNewIng({ ...newIng, packPrice: e.target.value })} />
                </div>
                <div>
                  <label className={label} htmlFor="ni-label">
                    Pack label (optional)
                  </label>
                  <input id="ni-label" placeholder="e.g. 400g tin" className={field} value={newIng.packLabel} onChange={(e) => setNewIng({ ...newIng, packLabel: e.target.value })} />
                </div>
                <label className="flex items-center gap-2 self-end pb-2 text-sm">
                  <input type="checkbox" checked={newIng.staple} onChange={(e) => setNewIng({ ...newIng, staple: e.target.checked })} />
                  Cupboard staple
                </label>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {(["kcal", "protein", "carbs", "fat", "fibre"] as const).map((k) => (
                  <div key={k}>
                    <label className={label} htmlFor={`ni-${k}`}>
                      {k === "kcal" ? "Calories" : `${k[0].toUpperCase()}${k.slice(1)} (g)`}
                    </label>
                    <input id={`ni-${k}`} type="number" min={0} step="any" className={field} value={newIng[k]} onChange={(e) => setNewIng({ ...newIng, [k]: e.target.value })} />
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-stone-500">Nutrition is {perLabel}. Staples like spices are costed by the amount used, not whole packs.</p>
              {newIngError && <p className="text-sm text-rose-600">{newIngError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={addNewIngredient} className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800">
                  Add ingredient
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreatingFor(null);
                    setNewIngError(null);
                  }}
                  className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-stone-200">
          <h2 className="font-bold">Method</h2>
          <div>
            <label className={label} htmlFor="steps">
              Steps, one per line
            </label>
            <textarea
              id="steps"
              rows={7}
              className={field}
              value={steps}
              placeholder={"Heat the oven to 200C / Gas 6.\nFry the onion for 5 minutes..."}
              onChange={(e) => setSteps(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-stone-500">For oven temperatures, include the gas mark, e.g. &quot;200C / Gas 6&quot;.</p>
          </div>
          <div>
            <label className={label} htmlFor="tip">
              Tip (optional)
            </label>
            <input id="tip" className={field} value={tip} onChange={(e) => setTip(e.target.value)} />
          </div>
          <div>
            <label className={label} htmlFor="airfryer">
              Ninja Dual Zone method (optional, one step per line)
            </label>
            <textarea
              id="airfryer"
              rows={3}
              className={field}
              value={airFryer}
              placeholder="Zone 1: chicken, AIR FRY 200C for 15 minutes..."
              onChange={(e) => setAirFryer(e.target.value)}
            />
          </div>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-2xl bg-white p-5 ring-1 ring-stone-200">
          <h2 className="font-bold">Per serving</h2>
          <p className={`mt-2 text-3xl font-bold ${n.kcal > KCAL_CAP ? "text-rose-700" : "text-emerald-700"}`}>{n.kcal} kcal</p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <dt className="text-stone-500">Protein</dt>
            <dd className="text-right font-medium">{n.protein} g</dd>
            <dt className="text-stone-500">Carbs</dt>
            <dd className="text-right font-medium">{n.carbs} g</dd>
            <dt className="text-stone-500">Fat</dt>
            <dd className="text-right font-medium">{n.fat} g</dd>
            <dt className="text-stone-500">Cost for {SERVINGS}</dt>
            <dd className="text-right font-medium">{gbp(cost)}</dd>
            <dt className="text-stone-500">Total time</dt>
            <dd className="text-right font-medium">
              {total} min{total <= QUICK_MAX_MINS ? " · quick" : ""}
            </dd>
          </dl>
          {warnings.length > 0 && (
            <ul className="mt-4 space-y-1 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
              {warnings.map((w) => (
                <li key={w}>This recipe {w}.</li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-stone-500">
            Must be free of fish, shellfish and nuts and under {KCAL_CAP.toLocaleString()} kcal per serving.
          </p>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {pending ? "Saving..." : recipe ? "Save changes" : "Save recipe"}
        </button>
        <Link href={recipe ? `/recipe/${recipe.slug}` : "/recipes"} className="block text-center text-sm text-stone-500 hover:text-stone-800">
          Cancel
        </Link>
      </aside>
    </form>
  );
}
