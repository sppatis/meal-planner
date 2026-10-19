import type { Category } from "@/lib/types";

export const CATEGORY_STYLE: Record<Category, { chip: string; art: string }> = {
  rice: { chip: "bg-amber-100 text-amber-800", art: "from-amber-200 via-orange-100 to-yellow-50" },
  pasta: { chip: "bg-rose-100 text-rose-800", art: "from-rose-200 via-red-100 to-orange-50" },
  potato: { chip: "bg-yellow-100 text-yellow-800", art: "from-yellow-200 via-amber-100 to-stone-50" },
  veggie: { chip: "bg-emerald-100 text-emerald-800", art: "from-emerald-200 via-lime-100 to-green-50" },
  fakeaway: { chip: "bg-violet-100 text-violet-800", art: "from-violet-200 via-fuchsia-100 to-pink-50" },
  other: { chip: "bg-sky-100 text-sky-800", art: "from-sky-200 via-cyan-100 to-blue-50" },
};
