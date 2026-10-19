"use client";

import { useState, useTransition } from "react";
import { setPrice } from "@/app/actions";

export function PriceInput({ id, defaultPrice, override }: { id: string; defaultPrice: number; override?: number }) {
  const [value, setValue] = useState((override ?? defaultPrice).toFixed(2));
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save(next: number | null) {
    startTransition(async () => {
      await setPrice(id, next);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <label className="flex items-center rounded-lg bg-white ring-1 ring-stone-300 focus-within:ring-2 focus-within:ring-emerald-600">
        <span className="pl-2 text-stone-500">£</span>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            const n = Number(value);
            if (!Number.isFinite(n) || n < 0) return setValue((override ?? defaultPrice).toFixed(2));
            if (Math.abs(n - (override ?? defaultPrice)) < 0.005) return;
            save(Math.abs(n - defaultPrice) < 0.005 ? null : n);
          }}
          className="w-20 bg-transparent px-1 py-1.5 text-right outline-none"
          aria-label="Pack price"
        />
      </label>
      <span className="w-14 text-left text-xs">
        {pending ? (
          <span className="text-stone-400">Saving</span>
        ) : saved ? (
          <span className="text-emerald-700">Saved</span>
        ) : override !== undefined ? (
          <button
            type="button"
            onClick={() => {
              setValue(defaultPrice.toFixed(2));
              save(null);
            }}
            className="text-stone-500 underline hover:text-emerald-700"
          >
            Reset
          </button>
        ) : null}
      </span>
    </div>
  );
}
