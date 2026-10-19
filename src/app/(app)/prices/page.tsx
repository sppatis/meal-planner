import type { Metadata } from "next";
import { connection } from "next/server";
import { INGREDIENT_LIST } from "@/data/ingredients";
import { PriceInput } from "@/components/price-input";
import { AISLE_ORDER, tescoSearchUrl } from "@/lib/cost";
import { store } from "@/lib/store";

export const metadata: Metadata = { title: "Prices" };

export default async function PricesPage() {
  await connection();
  const overrides = await store.getPriceOverrides();
  const groups = AISLE_ORDER.map((aisle) => ({
    aisle,
    items: INGREDIENT_LIST.filter((i) => i.aisle === aisle).sort((a, b) => a.name.localeCompare(b.name)),
  }));

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16">
      <h1 className="mt-6 text-3xl font-bold">Tesco prices</h1>
      <p className="mt-2 text-stone-600">
        Tesco doesn&apos;t offer a public price feed, so these are estimates. If a price is wrong, or you&apos;ve spotted a
        Clubcard deal, update it here and every weekly budget will recalculate. Changes save when you leave the box.
      </p>

      {groups.map((g) => (
        <section key={g.aisle} className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">{g.aisle}</h2>
          <ul className="mt-1 divide-y divide-stone-100 rounded-2xl bg-white px-4 ring-1 ring-stone-200">
            {g.items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <a href={tescoSearchUrl(i)} target="_blank" rel="noreferrer" className="font-medium hover:text-emerald-700">
                    {i.name}
                  </a>
                  <p className="text-xs text-stone-500">
                    {i.packLabel}
                    {i.staple ? " · cupboard staple" : ""}
                  </p>
                </div>
                <PriceInput id={i.id} defaultPrice={i.packPrice} override={overrides[i.id]} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
