import Link from "next/link";
import { logout } from "@/app/login/actions";
import { LibraryProvider } from "@/components/library-provider";
import { authRequired } from "@/lib/auth-token";
import { loadCustom, loadPlanList } from "@/lib/data";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [custom, { active }] = await Promise.all([loadCustom(), loadPlanList()]);
  return (
    <LibraryProvider recipes={custom.recipes} ingredients={custom.ingredients}>
      <header className="no-print sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="leading-tight">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-emerald-700">
              {active.title}
            </span>
            <span className="text-lg font-bold">Dinner Planner</span>
          </Link>
          <nav className="flex gap-1 text-sm font-medium">
            <Link href="/" className="rounded-lg px-3 py-2 hover:bg-stone-100">
              Plan
            </Link>
            <Link href="/plans" className="rounded-lg px-3 py-2 hover:bg-stone-100">
              Plans
            </Link>
            <Link href="/recipes" className="rounded-lg px-3 py-2 hover:bg-stone-100">
              Recipes
            </Link>
            <Link href="/prices" className="rounded-lg px-3 py-2 hover:bg-stone-100">
              Prices
            </Link>
            {authRequired() && (
              <form action={logout}>
                <button className="rounded-lg px-3 py-2 text-stone-500 hover:bg-stone-100 hover:text-stone-800">
                  Sign out
                </button>
              </form>
            )}
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </LibraryProvider>
  );
}
