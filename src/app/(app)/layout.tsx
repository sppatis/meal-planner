import Link from "next/link";
import { LibraryProvider } from "@/components/library-provider";
import { loadCustom } from "@/lib/data";
import { storageMisconfigured } from "@/lib/store";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const custom = await loadCustom();
  return (
    <LibraryProvider recipes={custom.recipes} ingredients={custom.ingredients}>
      <header className="no-print sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="leading-tight">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-emerald-700">
              Road to Australia
            </span>
            <span className="text-lg font-bold">Dinner Planner</span>
          </Link>
          <nav className="flex gap-1 text-sm font-medium">
            <Link href="/" className="rounded-lg px-3 py-2 hover:bg-stone-100">
              Plan
            </Link>
            <Link href="/recipes" className="rounded-lg px-3 py-2 hover:bg-stone-100">
              Recipes
            </Link>
            <Link href="/prices" className="rounded-lg px-3 py-2 hover:bg-stone-100">
              Prices
            </Link>
          </nav>
        </div>
      </header>
      {storageMisconfigured && (
        <div className="bg-rose-600 px-4 py-2 text-center text-sm text-white">
          Supabase isn&apos;t configured, so changes won&apos;t be saved. Set SUPABASE_URL and
          SUPABASE_SERVICE_ROLE_KEY in Vercel.
        </div>
      )}
      <div className="flex-1">{children}</div>
    </LibraryProvider>
  );
}
