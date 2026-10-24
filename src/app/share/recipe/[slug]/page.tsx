import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NutritionPanel } from "@/components/nutrition-panel";
import { CATEGORY_LABELS, SERVINGS } from "@/lib/constants";
import { loadLibrary } from "@/lib/data";
import { nutritionPerServing } from "@/lib/nutrition";
import { recipeLines } from "@/lib/recipe-view";
import { siteUrl } from "@/lib/site";
import { store } from "@/lib/store";

export async function generateMetadata({ params }: PageProps<"/share/recipe/[slug]">): Promise<Metadata> {
  const recipe = (await loadLibrary()).bySlug[(await params).slug];
  if (!recipe) return {};
  return {
    title: recipe.name,
    description: recipe.description,
    robots: { index: false, follow: false },
    openGraph: { title: recipe.name, description: recipe.description, type: "article" },
  };
}

export default async function ShareRecipePage({ params }: PageProps<"/share/recipe/[slug]">) {
  const { slug } = await params;
  const library = await loadLibrary();
  const recipe = library.bySlug[slug];
  if (!recipe) notFound();

  const [photos, ratings, base] = await Promise.all([store.getPhotos(slug), store.getRatings(), siteUrl()]);
  const n = nutritionPerServing(recipe, library.ingredients);
  const lines = recipeLines(recipe, library.ingredients);
  const photoUrls = photos.map((p) => (p.url.startsWith("http") ? p.url : `${base}${p.url}`));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.name,
    description: recipe.description,
    url: `${base}/share/recipe/${slug}`,
    ...(photoUrls.length ? { image: photoUrls } : {}),
    recipeCategory: "Dinner",
    keywords: [CATEGORY_LABELS[recipe.category], "fish free", "nut free", "low calorie"].join(", "),
    recipeYield: [String(SERVINGS), `${SERVINGS} servings`],
    prepTime: `PT${recipe.prepMins}M`,
    cookTime: `PT${recipe.cookMins}M`,
    totalTime: `PT${recipe.prepMins + recipe.cookMins}M`,
    recipeIngredient: lines.map((l) => l.text),
    recipeInstructions: recipe.steps.map((text, i) => ({ "@type": "HowToStep", position: i + 1, text })),
    nutrition: {
      "@type": "NutritionInformation",
      servingSize: "1 serving",
      calories: `${n.kcal} kcal`,
      proteinContent: `${n.protein} g`,
      carbohydrateContent: `${n.carbs} g`,
      fatContent: `${n.fat} g`,
      fiberContent: `${n.fibre} g`,
    },
    ...(ratings[slug]
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: ratings[slug], ratingCount: 1, bestRating: 5 } }
      : {}),
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <article>
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Dinner Planner recipe</p>
        <h1 className="mt-1 text-3xl font-bold">{recipe.name}</h1>
        <p className="mt-2 text-stone-600">{recipe.description}</p>
        <p className="mt-3 text-sm text-stone-600">
          Serves {SERVINGS} · Prep {recipe.prepMins} min · Cook {recipe.cookMins} min
        </p>

        {photoUrls[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrls[0]} alt={recipe.name} className="mt-5 aspect-[4/3] w-full rounded-2xl object-cover" />
        )}

        <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_16rem]">
          <section>
            <h2 className="text-xl font-bold">Ingredients</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {lines.map((l) => (
                <li key={l.key}>{l.text}</li>
              ))}
            </ul>
          </section>
          <NutritionPanel n={n} />
        </div>

        <section className="mt-8">
          <h2 className="text-xl font-bold">Method</h2>
          <ol className="mt-2 list-decimal space-y-3 pl-5">
            {recipe.steps.map((s, i) => (
              <li key={i} className="leading-relaxed">
                {s}
              </li>
            ))}
          </ol>
        </section>

        {recipe.airFryer && (
          <section className="mt-8">
            <h2 className="text-xl font-bold">Ninja Dual Zone method</h2>
            <ol className="mt-2 list-decimal space-y-2 pl-5">
              {recipe.airFryer.map((s, i) => (
                <li key={i} className="leading-relaxed">
                  {s}
                </li>
              ))}
            </ol>
          </section>
        )}
      </article>
    </main>
  );
}
