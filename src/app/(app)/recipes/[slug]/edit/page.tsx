import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecipeForm } from "@/components/recipe-form";
import { loadLibrary } from "@/lib/data";

export const metadata: Metadata = { title: "Edit recipe" };

export default async function EditRecipePage({ params }: PageProps<"/recipes/[slug]/edit">) {
  const { slug } = await params;
  const recipe = (await loadLibrary()).bySlug[slug];
  if (!recipe?.custom) notFound();

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16">
      <Link href={`/recipe/${slug}`} className="mt-4 inline-block text-sm text-stone-500 hover:text-emerald-700">
        ← Back to the recipe
      </Link>
      <h1 className="mt-3 text-3xl font-bold">Edit {recipe.name}</h1>
      <RecipeForm recipe={recipe} />
    </main>
  );
}
