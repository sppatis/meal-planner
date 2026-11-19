import Link from "next/link";
import { LibraryProvider } from "@/components/library-provider";
import { SiteNav } from "@/components/site-nav";
import { authRequired } from "@/lib/auth-token";
import { loadCustom, loadPlanList, loadSavedRecipes } from "@/lib/data";
import { photoUrl } from "@/lib/store/photo-files";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [custom, saved, { household, active }] = await Promise.all([loadCustom(), loadSavedRecipes(), loadPlanList()]);
  return (
    <LibraryProvider recipes={custom.recipes} ingredients={custom.ingredients} saved={saved}>
      <header className="no-print sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-(--header-h) max-w-7xl items-center justify-between gap-4 px-4">
          <Link href="/" className="min-w-0 leading-tight">
            <span className="block truncate text-[10px] font-semibold uppercase tracking-widest text-emerald-700">
              {active?.title ?? household.name}
            </span>
            <span className="block text-lg font-bold">Dinner Planner</span>
          </Link>
          <SiteNav
            householdName={household.name}
            avatarUrl={household.avatarFile ? photoUrl(household.avatarFile) : null}
            canSignOut={authRequired()}
          />
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </LibraryProvider>
  );
}
