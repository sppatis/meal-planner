import type { Metadata } from "next";
import { HouseholdForm } from "@/components/household-form";
import { loadPlanList } from "@/lib/data";
import { photoUrl } from "@/lib/store/photo-files";

export const metadata: Metadata = { title: "Household" };

export default async function HouseholdPage() {
  const { household } = await loadPlanList();

  return (
    <main className="mx-auto max-w-4xl px-4 pb-16">
      <h1 className="mt-6 text-3xl font-bold">Household</h1>
      <p className="mt-2 max-w-2xl text-stone-600">
        The name and picture are yours. Allergies apply to every plan: a ticked allergen is left out of the dinners.
      </p>
      <HouseholdForm
        name={household.name}
        allergies={household.allergies}
        avatarUrl={household.avatarFile ? photoUrl(household.avatarFile) : null}
      />
    </main>
  );
}
