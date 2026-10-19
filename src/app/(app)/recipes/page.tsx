import type { Metadata } from "next";
import Link from "next/link";
import { RECIPES } from "@/data/recipes";
import { RecipeArt } from "@/components/recipe-art";
import { StarDisplay } from "@/components/stars";
import { CATEGORY_LABELS } from "@/lib/constants";
import { loadAppData } from "@/lib/data";
import { isQuick, nutritionPerServing, totalMins } from "@/lib/nutrition";
import type { Category } from "@/lib/types";

export const metadata: Metadata = { title: "Recipes" };

export default async function RecipesPage() {
  const { ratings, favourites, coverPhotos, slots } = await loadAppData();
  const fav = new Set(favourites);
  const timesPlanned = slots.reduce<Record<string, number>>((acc, s) => {
    acc[s.recipeSlug] = (acc[s.recipeSlug] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <main className="mx-auto max-w-7xl px-4 pb-16">
      <h1 className="mt-6 text-3xl font-bold">All recipes</h1>
      <p className="mt-2 text-stone-600">
        {RECIPES.length} dinners, all free of fish, shellfish and nuts. Hearts are your favourites.
      </p>
      {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
        <section key={cat} className="mt-8">
          <h2 className="text-xl font-bold">{CATEGORY_LABELS[cat]}</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            {RECIPES.filter((r) => r.category === cat).map((r) => (
              <Link
                key={r.slug}
                href={`/recipe/${r.slug}`}
                className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200 hover:shadow-md"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <RecipeArt recipe={r} photo={coverPhotos[r.slug]} />
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold leading-snug group-hover:text-emerald-800">
                    {fav.has(r.slug) && <span className="mr-1 text-rose-500">♥</span>}
                    {r.name}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    {nutritionPerServing(r).kcal} kcal · {totalMins(r)} min{isQuick(r) ? " · quick" : ""}
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                    <StarDisplay value={ratings[r.slug]} size="h-3 w-3" />
                    <span className="text-[11px] text-stone-400">{timesPlanned[r.slug] ?? 0}× planned</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
