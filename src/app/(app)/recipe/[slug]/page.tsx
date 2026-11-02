import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORY_STYLE } from "@/components/category-style";
import { Checklist } from "@/components/checklist";
import { DeleteRecipeButton } from "@/components/delete-recipe-button";
import { FavouriteButton } from "@/components/favourite-button";
import { VisibilityButton } from "@/components/visibility-button";
import { NutritionPanel } from "@/components/nutrition-panel";
import { PhotoGallery } from "@/components/photo-gallery";
import { ShareBox } from "@/components/share-box";
import { StarRating } from "@/components/stars";
import { CATEGORY_LABELS, DAY_NAMES } from "@/lib/constants";
import { gbp, priceOf, recipeCost } from "@/lib/cost";
import { dayIndex, formatDate, weekOf } from "@/lib/dates";
import { EQUIPMENT_LABELS, equipmentFor } from "@/lib/equipment";
import { findPlan, loadLibrary, loadPlanList, NO_PLAN_SETTINGS } from "@/lib/data";
import { scaledLibrary } from "@/lib/exclusions";
import { planPrices } from "@/lib/plan";
import { storeName, storeSearchUrl } from "@/lib/stores";
import { isQuick, nutritionPerServing } from "@/lib/nutrition";
import { nutritionText, recipeLines } from "@/lib/recipe-view";
import { siteUrl } from "@/lib/site";
import { store } from "@/lib/store";

export async function generateMetadata({ params }: PageProps<"/recipe/[slug]">): Promise<Metadata> {
  const recipe = (await loadLibrary()).bySlug[(await params).slug];
  return { title: recipe?.name ?? "Recipe" };
}

export default async function RecipePage({ params, searchParams }: PageProps<"/recipe/[slug]">) {
  const { slug } = await params;
  const { date, plan: planParam } = await searchParams;
  const fullLibrary = await loadLibrary();
  const { hs, active } = await loadPlanList();
  const plan = (typeof planParam === "string" ? await findPlan(planParam) : undefined) ?? active;
  const { people, store: shopId } = plan ?? NO_PLAN_SETTINGS;
  const library = scaledLibrary(fullLibrary, people);
  const recipe = library.bySlug[slug];
  if (!recipe) notFound();

  const [ratings, favourites, hidden, photos, prices, slots, base] = await Promise.all([
    hs.getRatings(),
    hs.getFavourites(),
    hs.getHiddenRecipes(),
    store.getPhotos(slug),
    planPrices({ store: shopId }, library.ingredients),
    plan ? hs.getSlots(plan.id) : [],
    siteUrl(),
  ]);
  const isHidden = hidden.includes(slug);

  const shop = storeName(shopId);
  const n = nutritionPerServing(recipe, library.ingredients);
  const lines = recipeLines(recipe, library.ingredients);
  const planDate = plan && typeof date === "string" && weekOf(plan, date) !== null ? date : undefined;
  const backWeek = plan && planDate ? weekOf(plan, planDate)! + 1 : undefined;
  const planHref = !plan ? "/recipes" : plan.id === active?.id ? "/" : `/plans/${plan.id}`;
  const scheduled = slots.filter((s) => s.recipeSlug === slug).map((s) => s.date);
  const quickNight = !!plan && !!planDate && plan.quickDays.includes(dayIndex(planDate));
  const equipment = equipmentFor(recipe);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16">
      <Link
        href={backWeek ? `${planHref}#week-${backWeek}` : planHref}
        className="no-print mt-4 inline-block text-sm text-stone-500 hover:text-emerald-700"
      >
        ← Back to {backWeek ? `week ${backWeek}` : plan ? "the plan" : "all recipes"}
      </Link>

      <header className="mt-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${CATEGORY_STYLE[recipe.category].chip}`}>
            {CATEGORY_LABELS[recipe.category]}
          </span>
          {isQuick(recipe) && (
            <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-800">Quick</span>
          )}
          {recipe.custom && (
            <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
              Our recipe
            </span>
          )}
          {planDate && (
            <span className="text-sm text-stone-500">
              {DAY_NAMES[dayIndex(planDate)]} {formatDate(planDate, { day: "numeric", month: "long" })}
              {quickNight ? " · Quick night" : ""}
            </span>
          )}
        </div>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{recipe.name}</h1>
        <p className="mt-2 max-w-2xl text-stone-600">{recipe.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <span>
            <b>{recipe.prepMins}</b> min prep · <b>{recipe.cookMins}</b> min cook
          </span>
          <span>
            Serves <b>{people}</b>
          </span>
          <span>
            About <b>{gbp(recipeCost(recipe, prices, library.ingredients))}</b> for {people} at {shop}
          </span>
          <VisibilityButton recipeSlug={slug} hidden={isHidden} labelled />
          {recipe.custom ? (
            <span className="flex items-center gap-2">
              <Link
                href={`/recipes/${slug}/edit`}
                className="btn-secondary"
              >
                Edit recipe
              </Link>
              <DeleteRecipeButton slug={slug} name={recipe.name} />
            </span>
          ) : (
            <FavouriteButton recipeSlug={slug} favourite={favourites.includes(slug)} />
          )}
        </div>
        {isHidden && (
          <p className="mt-2 text-sm text-stone-500">
            Hidden from your plans — dinners already using it will be swapped the next time the plan is opened.
          </p>
        )}
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Equipment">
          {equipment.map((e) => (
            <li
              key={e}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                e === "airFryer" ? "bg-stone-900 text-white" : "bg-stone-200 text-stone-700"
              }`}
            >
              {EQUIPMENT_LABELS[e]}
            </li>
          ))}
        </ul>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <aside className="space-y-5">
          <PhotoGallery recipeSlug={slug} photos={photos} recipeName={recipe.name} />
          <div className="card p-4">
            <h2 className="mb-2 font-semibold">How did it go?</h2>
            <StarRating recipeSlug={slug} value={ratings[slug]} />
            <p className="mt-2 text-xs text-stone-500">
              Dinners rated 4 stars or more become favourites you can swap in on the plan.
            </p>
          </div>
          <NutritionPanel n={n} servings={people} />
          <ShareBox title={recipe.name} shareUrl={`${base}/share/recipe/${slug}`} nutritionText={nutritionText(recipe, library.ingredients)} />
          {plan && scheduled.length > 0 && (
            <div className="rounded-2xl bg-white p-4 text-sm ring-1 ring-stone-200">
              <h2 className="font-semibold">On {plan.title}</h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {scheduled.map((d) => (
                  <li key={d}>
                    <Link
                      href={`${planHref}#week-${weekOf(plan, d)! + 1}`}
                      className="rounded-full bg-stone-100 px-2.5 py-1 text-xs hover:bg-emerald-50"
                    >
                      {formatDate(d, { weekday: "short", day: "numeric", month: "short" })}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        <div className="space-y-8">
          <section>
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-bold">Shopping list</h2>
              <span className="text-xs text-stone-500">
                For {people} · {shop} pack, est. price
              </span>
            </div>
            <div className="mt-2 rounded-2xl bg-white px-4 ring-1 ring-stone-200">
              <Checklist
                storageKey={`recipe-check:${slug}`}
                items={lines.map((l) => ({
                  id: l.key,
                  primary: `${l.qtyText}${l.ingredient.unit === "each" && !l.ingredient.packNoun ? "" : ` ${l.ingredient.name.toLowerCase()}`}`,
                  secondary: [l.note, `${l.ingredient.packLabel}${l.ingredient.staple ? " · cupboard staple" : ""}`]
                    .filter(Boolean)
                    .join(" · "),
                  meta: gbp(priceOf(l.ingredient, prices)),
                  href: storeSearchUrl(shopId, l.ingredient),
                  warning: l.ingredient.checkLabel,
                }))}
                linkLabel={shop}
              />
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold">Method</h2>
            <ol className="mt-3 space-y-4">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <p className="pt-1 leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
            {equipment.includes("oven") && (
              <p className="mt-6 rounded-2xl bg-orange-50 p-4 text-sm text-orange-900 ring-1 ring-orange-100">
                <b>Gas oven:</b> the top shelf runs hottest, so put things you want crispy there and turn trays halfway
                for even cooking.
                {recipe.airFryer ? " Or skip the oven and use the Ninja method below." : ""}
              </p>
            )}
            {recipe.tip && (
              <p className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-100">
                <b>Tip:</b> {recipe.tip}
              </p>
            )}
            {recipe.airFryer && (
              <div className="mt-6 rounded-2xl bg-stone-900 p-5 text-stone-100">
                <h3 className="font-bold text-white">Ninja Dual Zone method</h3>
                <p className="mt-1 text-xs text-stone-400">
                  Swap these in for the oven steps. SYNC makes both drawers finish together; MATCH copies Zone 1&apos;s
                  settings to Zone 2.
                </p>
                <ol className="mt-3 space-y-2">
                  {recipe.airFryer.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-bold">
                        {i + 1}
                      </span>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <p className="mt-6 rounded-2xl bg-stone-100 p-4 text-sm text-stone-600">
              <b>Allergy check:</b> no fish, shellfish or nuts in this recipe. Always check labels on sauces and
              spice mixes, as recipes change.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
