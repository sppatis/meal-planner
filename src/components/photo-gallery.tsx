"use client";

import { useRef, useState, useTransition } from "react";
import { deletePhoto, uploadPhoto } from "@/app/actions";
import type { Photo } from "@/lib/types";

const MAX_EDGE = 1600;

/** Downscale on the device so uploads stay well under the server's body limit. */
async function resize(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process image"))), "image/jpeg", 0.85),
  );
}

export function PhotoGallery({ recipeSlug, photos, recipeName }: { recipeSlug: string; photos: Photo[]; recipeName: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const current = photos[Math.min(active, photos.length - 1)];

  function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      try {
        const blob = await resize(file);
        const form = new FormData();
        form.set("recipeSlug", recipeSlug);
        form.set("photo", new File([blob], "photo.jpg", { type: "image/jpeg" }));
        await uploadPhoto(form);
        setActive(0);
      } catch {
        setError("Upload failed. Please try a different photo.");
      } finally {
        if (input.current) input.current.value = "";
      }
    });
  }

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-stone-100 ring-1 ring-stone-200">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.url} alt={recipeName} className="h-full w-full object-cover" />
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
            <span className="text-sm font-medium">Add a photo of your dinner</span>
          </button>
        )}
        {pending && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-medium">
            Uploading...
          </div>
        )}
      </div>

      {photos.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActive(i)}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-2 ${p.id === current?.id ? "ring-emerald-600" : "ring-transparent"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={pending}
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium hover:border-emerald-600"
        >
          {photos.length ? "Add another photo" : "Upload photo"}
        </button>
        {current && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (confirm("Delete this photo?")) startTransition(() => deletePhoto(current.id));
            }}
            className="rounded-lg px-3 py-1.5 text-sm text-stone-500 hover:bg-rose-50 hover:text-rose-700"
          >
            Delete photo
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
