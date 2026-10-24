import Link from "next/link";
import { DAY_NAMES, QUICK_MAX_MINS, ROLE_LABELS } from "@/lib/constants";
import { gbp, recipeCost, type PriceOverrides } from "@/lib/cost";
import { dayIndex, formatDate } from "@/lib/dates";
import { nutritionPerServing, totalMins } from "@/lib/nutrition";
import type { IngredientMap, MealSlot, Plan, Recipe } from "@/lib/types";
import { CATEGORY_STYLE } from "./category-style";
import { RecipeArt } from "./recipe-art";
import { StarDisplay } from "./stars";
import { SwapButton } from "./swap-button";

interface Props {
  plan: Plan;
  slot: MealSlot;
  recipe: Recipe;
  ingredients: IngredientMap;
  weekSlugs: string[];
  isToday: boolean;
  photo?: string;
  rating?: number;
  favourites: string[];
  ratings: Record<string, number>;
  prices: PriceOverrides;
}

export function MealCard({ plan, slot, recipe, ingredients, weekSlugs, isToday, photo, rating, favourites, ratings, prices }: Props) {
  const day = dayIndex(slot.date);
  const quickNight = plan.quickDays.includes(day);
  const n = nutritionPerServing(recipe, ingredients);

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition hover:shadow-md ${
        isToday ? "ring-2 ring-emerald-600" : "ring-stone-200"
      }`}
    >
      <div className="flex items-baseline justify-between px-3 pt-3">
        <p className="text-sm font-semibold">
          {DAY_NAMES[day]}
          {isToday && <span className="ml-1.5 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] text-white">TODAY</span>}
        </p>
        <p className="text-xs text-stone-500">{formatDate(slot.date)}</p>
      </div>
      <p className={`mx-3 mt-1 min-h-5 text-[11px] font-medium ${quickNight ? "text-sky-700" : "text-transparent"}`}>
        {quickNight ? `Quick night · ${QUICK_MAX_MINS} min or less` : "-"}
      </p>
      <Link href={`/recipe/${recipe.slug}?plan=${plan.id}&date=${slot.date}`} className="mt-2 flex flex-1 flex-col">
        <div className="aspect-[5/2] overflow-hidden min-[480px]:aspect-[4/3]">
          <RecipeArt recipe={recipe} photo={photo} className="transition group-hover:scale-105" />
        </div>
        <div className="flex flex-1 flex-col gap-2 p-3">
          <div className="flex flex-wrap gap-1">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${CATEGORY_STYLE[recipe.category].chip}`}>
              {ROLE_LABELS[slot.role]}
            </span>
            {recipe.custom && (
              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-800">Ours</span>
            )}
            {recipe.airFryer && (
              <span className="rounded-full bg-stone-900 px-2 py-0.5 text-[11px] font-semibold text-white">Ninja</span>
            )}
          </div>
          <h3 className="font-semibold leading-snug group-hover:text-emerald-800">{recipe.name}</h3>
          <dl className="mt-auto grid grid-cols-3 gap-1 text-center text-[11px] text-stone-500">
            <div className="rounded-lg bg-stone-50 py-1">
              <dt className="sr-only">Calories</dt>
              <dd>
                <b className="block text-sm text-stone-900">{n.kcal}</b>kcal
              </dd>
            </div>
            <div className="rounded-lg bg-stone-50 py-1">
              <dt className="sr-only">Time</dt>
              <dd>
                <b className="block text-sm text-stone-900">{totalMins(recipe)}</b>min
              </dd>
            </div>
            <div className="rounded-lg bg-stone-50 py-1">
              <dt className="sr-only">Cost</dt>
              <dd>
                <b className="block text-sm text-stone-900">{gbp(recipeCost(recipe, prices, ingredients))}</b>for 3
              </dd>
            </div>
          </dl>
        </div>
      </Link>
      <div className="flex items-center justify-between border-t border-stone-100 px-3 py-2">
        <StarDisplay value={rating} size="h-3.5 w-3.5" />
        <SwapButton
          planId={plan.id}
          budget={plan.weeklyBudget}
          excluded={plan.excluded}
          quickDays={plan.quickDays}
          date={slot.date}
          dayLabel={DAY_NAMES[day]}
          role={slot.role}
          currentSlug={slot.recipeSlug}
          weekSlugs={weekSlugs}
          favourites={favourites}
          ratings={ratings}
          prices={prices}
        />
      </div>
    </article>
  );
}
