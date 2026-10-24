import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlanForm } from "@/components/plan-form";
import { loadPlanList } from "@/lib/data";

export const metadata: Metadata = { title: "Edit plan" };

export default async function EditPlanPage({ params }: PageProps<"/plans/[id]/edit">) {
  const { id } = await params;
  const { plans, active } = await loadPlanList();
  const plan = plans.find((p) => p.id === id);
  if (!plan) notFound();

  return (
    <main className="mx-auto max-w-4xl px-4 pb-16">
      <Link href="/plans" className="mt-4 inline-block text-sm text-stone-500 hover:text-emerald-700">
        ← All plans
      </Link>
      <h1 className="mt-3 text-3xl font-bold">Edit {plan.title}</h1>
      <PlanForm plan={plan} isActive={plan.id === active.id} />
    </main>
  );
}
