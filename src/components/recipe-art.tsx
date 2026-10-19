import { CATEGORY_LABELS } from "@/lib/constants";
import type { Recipe } from "@/lib/types";
import { CATEGORY_STYLE } from "./category-style";

export function RecipeArt({ recipe, photo, className = "" }: { recipe: Recipe; photo?: string; className?: string }) {
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photo} alt={recipe.name} className={`h-full w-full object-cover ${className}`} loading="lazy" />
    );
  }
  return (
    <div
      className={`flex h-full w-full items-end bg-gradient-to-br p-3 ${CATEGORY_STYLE[recipe.category].art} ${className}`}
    >
      <span className="text-[11px] font-semibold uppercase tracking-widest text-stone-700/60">
        {CATEGORY_LABELS[recipe.category]}
      </span>
    </div>
  );
}
