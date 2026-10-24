import type { Metadata } from "next";
import Link from "next/link";
import { RecipeForm } from "@/components/recipe-form";

export const metadata: Metadata = { title: "Add a recipe" };

export default function NewRecipePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-16">
      <Link href="/recipes" className="mt-4 inline-block text-sm text-stone-500 hover:text-emerald-700">
        ← All recipes
      </Link>
      <h1 className="mt-3 text-3xl font-bold">Add one of your favourites</h1>
      <p className="mt-2 max-w-2xl text-stone-600">
        Your recipe gets the same page as the built-in ones: shopping list, Tesco prices, calories, method, photos,
        ratings and MyFitnessPal sharing. It&apos;ll show up as a favourite when you replace a dinner on the plan.
      </p>
      <RecipeForm />
    </main>
  );
}
