import type { Metadata } from "next";
import Link from "next/link";
import { PriceInput } from "@/components/price-input";
import { AISLE_ORDER } from "@/lib/cost";
import { loadLibrary, loadPlanList, NO_PLAN_SETTINGS } from "@/lib/data";
import { store } from "@/lib/store";
import { estimatedPrice, isStoreId, STORES, storeName, storeSearchUrl } from "@/lib/stores";

export const metadata: Metadata = { title: "Prices" };

export default async function PricesPage({ searchParams }: PageProps<"/prices">) {
  const { store: storeParam } = await searchParams;
  const { active } = await loadPlanList();
  const shopId = isStoreId(storeParam) ? storeParam : (active ?? NO_PLAN_SETTINGS).store;
  const shop = storeName(shopId);
  const [library, overrides, tescoOverrides] = await Promise.all([
    loadLibrary(),
    store.getPriceOverrides(shopId),
    store.getPriceOverrides("tesco"),
  ]);
  const all = Object.values(library.ingredients);
  const groups = AISLE_ORDER.map((aisle) => ({
    aisle,
    items: all.filter((i) => i.aisle === aisle).sort((a, b) => a.name.localeCompare(b.name)),
  }));

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16">
      <h1 className="mt-6 text-3xl font-bold">{shop} prices</h1>
      <p className="mt-2 text-stone-600">
        Supermarkets don&apos;t offer a public price feed, so these are estimates
        {shopId === "tesco" ? "" : `, worked out from Tesco's prices and how ${shop} usually compares`}. If a price is
        wrong, or you&apos;ve spotted a deal, update it here and every weekly budget at {shop} will recalculate. Changes
        save when you leave the box and are shared with every household.
      </p>

      <nav aria-label="Supermarket" className="mt-4 flex flex-wrap gap-1.5">
        {STORES.map((s) => (
          <Link
            key={s.id}
            href={`/prices?store=${s.id}`}
            aria-current={s.id === shopId ? "page" : undefined}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              s.id === shopId
                ? "bg-emerald-700 text-white"
                : "bg-white text-stone-600 ring-1 ring-stone-200 hover:ring-emerald-600"
            }`}
          >
            {s.name}
          </Link>
        ))}
      </nav>

      {groups.map((g) => (
        <section key={g.aisle} className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">{g.aisle}</h2>
          <ul className="mt-1 divide-y divide-stone-100 rounded-2xl bg-white px-4 ring-1 ring-stone-200">
            {g.items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <a
                    href={storeSearchUrl(shopId, i)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium hover:text-emerald-700"
                  >
                    {i.name}
                  </a>
                  <p className="text-xs text-stone-500">
                    {i.packLabel}
                    {i.staple ? " · cupboard staple" : ""}
                    {i.custom ? " · added by you" : ""}
                  </p>
                </div>
                <PriceInput
                  key={`${shopId}:${i.id}`}
                  storeId={shopId}
                  id={i.id}
                  defaultPrice={estimatedPrice(i, shopId, tescoOverrides)}
                  override={overrides[i.id]}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
