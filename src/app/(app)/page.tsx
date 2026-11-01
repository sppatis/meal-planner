import Link from "next/link";
import { PlanView } from "@/components/plan-view";
import { KCAL_CAP } from "@/lib/constants";
import { loadPlanList } from "@/lib/data";

export default async function HomePage() {
  const { household, active } = await loadPlanList();
  if (active) return <PlanView />;

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16">
      <section className="mt-10 rounded-3xl bg-gradient-to-br from-emerald-700 to-teal-800 p-8 text-white sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-200">Welcome, {household.name}</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Start a new plan</h1>
        <p className="mt-3 max-w-xl text-emerald-50/90">
          Choose how many people you&apos;re feeding, where you shop and your weekly budget. You&apos;ll get a dinner for
          every night: no fish, no nuts and under {KCAL_CAP.toLocaleString()} kcal each, with a shopping list for every
          week.
        </p>
        <Link
          href="/plans/new"
          className="mt-6 inline-block rounded-xl bg-white px-5 py-3 font-semibold text-emerald-800 hover:bg-emerald-50"
        >
          Start a new plan
        </Link>
      </section>
      <p className="mt-6 text-center text-sm text-stone-600">
        In the meantime, have a look through the{" "}
        <Link href="/recipes" className="font-medium text-emerald-700 hover:underline">
          recipes
        </Link>
        .
      </p>
    </main>
  );
}
