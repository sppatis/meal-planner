import type { Metadata } from "next";
import Link from "next/link";
import { PlanForm } from "@/components/plan-form";

export const metadata: Metadata = { title: "New plan" };

export default function NewPlanPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 pb-16">
      <Link href="/plans" className="mt-4 inline-block text-sm text-stone-500 hover:text-emerald-700">
        ← All plans
      </Link>
      <h1 className="mt-3 text-3xl font-bold">New plan</h1>
      <p className="mt-2 max-w-2xl text-stone-600">
        Dinners are planned automatically for every week, with quick meals on swimming and badminton nights and a
        fake-away on Friday or Saturday.
      </p>
      <PlanForm />
    </main>
  );
}
