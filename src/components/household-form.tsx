"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateHousehold } from "@/app/actions";
import { ALLERGENS, ALLERGEN_LABELS } from "@/lib/allergens";
import type { Allergen } from "@/lib/types";

const field =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600";

export function HouseholdForm({
  name,
  allergies,
  avatarUrl,
}: {
  name: string;
  allergies: readonly Allergen[];
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    setErrors([]);
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateHousehold(data);
      if (result.ok) {
        setSaved(true);
        router.refresh();
      } else setErrors(result.errors);
    });
  }

  return (
    <form onSubmit={submit} className="mt-6 max-w-2xl space-y-6">
      {errors.length > 0 && (
        <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200" role="alert">
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      )}
      {saved && (
        <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900 ring-1 ring-emerald-200" role="status">
          Saved. Every plan now follows these allergies.
        </p>
      )}

      <section className="card p-5">
        <h2 className="font-bold">Name</h2>
        <p className="mt-1 text-xs text-stone-500">This is the name in the header.</p>
        <label className="mt-3 block text-xs font-semibold text-stone-600" htmlFor="household-name">
          Household name
        </label>
        <input id="household-name" name="name" required minLength={2} maxLength={40} defaultValue={name} className={`${field} mt-1`} />
      </section>

      <section className="card p-5">
        <h2 className="font-bold">Picture</h2>
        <p className="mt-1 text-xs text-stone-500">A JPEG, PNG or WebP image, up to 4 MB. Shown beside the household name.</p>
        <div className="mt-3 flex items-center gap-4">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover ring-1 ring-stone-200" />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-800">
              {name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <input name="avatar" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm text-stone-600" />
        </div>
        {avatarUrl && (
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" name="removeAvatar" />
            Remove the current picture
          </label>
        )}
      </section>

      <fieldset className="card p-5">
        <legend className="font-bold">Allergies and intolerances</legend>
        <p className="mt-1 text-xs text-stone-500">
          Tick everything this household needs to avoid. Every plan leaves out dinners that use them. Milk covers the
          dairy in the catalogue. Shellfish and nuts are already kept out of every dinner. Tick Fish to leave fish
          dinners out as well.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ALLERGENS.map((allergen) => (
            <label key={allergen} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-stone-50">
              <input type="checkbox" name="allergies" value={allergen} defaultChecked={allergies.includes(allergen)} />
              {ALLERGEN_LABELS[allergen]}
            </label>
          ))}
        </div>
      </fieldset>

      <button type="submit" disabled={pending} className="btn-cta disabled:opacity-50">
        {pending ? "Saving..." : "Save household"}
      </button>
    </form>
  );
}
