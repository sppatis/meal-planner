import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PlanView } from "@/components/plan-view";
import { loadPlanList } from "@/lib/data";

export async function generateMetadata({ params }: PageProps<"/plans/[id]">): Promise<Metadata> {
  const { id } = await params;
  const { plans } = await loadPlanList();
  return { title: plans.find((p) => p.id === id)?.title ?? "Plan" };
}

export default async function PlanPage({ params }: PageProps<"/plans/[id]">) {
  const { id } = await params;
  const { plans, active } = await loadPlanList();
  const plan = plans.find((p) => p.id === id);
  if (!plan) notFound();
  if (plan.id === active.id) redirect("/");
  return <PlanView plan={plan} />;
}
