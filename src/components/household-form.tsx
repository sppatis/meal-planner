"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
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
  const input = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);
  const [trackedAvatar, setTrackedAvatar] = useState(avatarUrl);
  if (avatarUrl !== trackedAvatar) {
    setTrackedAvatar(avatarUrl);
    setRemove(false);
    setPreview(null);
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    setRemove(false);
    setPreview(URL.createObjectURL(file));
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    setErrors([]);
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateHousehold(data);
      if (result.ok) {
        setSaved(true);
        if (input.current) input.current.value = "";
        router.refresh();
      } else setErrors(result.errors);
    });
  }

  const shown = preview ?? (remove ? null : avatarUrl);

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
        {/* 28.333rem matches the recipe photo column: 5/12 of the max-w-6xl page after its padding and gap. */}
        <div className="mt-3 max-w-[28.333rem]">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-stone-100 ring-1 ring-stone-200">
            {shown ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shown} alt="" className="h-full w-full object-cover" />
            ) : (
              <button
                type="button"
                onClick={() => input.current?.click()}
                className="flex h-full w-full flex-col items-center justify-center gap-2 text-stone-500 hover:bg-stone-200/50"
              >
                <svg viewBox="0 0 24 24" className="h-10 w-10 fill-none stroke-current stroke-[1.5]" aria-hidden>
                  <path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
                <span className="text-sm font-medium">Add a photo of your household</span>
              </button>
            )}
            {pending && preview && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-medium">
                Uploading...
              </div>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => input.current?.click()} disabled={pending} className="btn-secondary">
              Upload photo
            </button>
            {avatarUrl && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="removeAvatar"
                  checked={remove}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setRemove(checked);
                    if (checked) {
                      if (input.current) input.current.value = "";
                      setPreview(null);
                    }
                  }}
                />
                Remove the current picture
              </label>
            )}
          </div>
          <input
            ref={input}
            name="avatar"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </div>
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
