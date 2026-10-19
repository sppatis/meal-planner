"use client";

import { useEffect, useState } from "react";

export interface ChecklistItem {
  id: string;
  primary: string;
  secondary?: string;
  meta?: string;
  href?: string;
  warning?: string;
}

/** Tick-off list that remembers its state on this device. */
export function Checklist({ storageKey, items }: { storageKey: string; items: ChecklistItem[] }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setChecked(new Set(JSON.parse(saved)));
    } catch {}
  }, [storageKey]);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(storageKey, JSON.stringify([...next]));
      return next;
    });
  }

  return (
    <ul className="divide-y divide-stone-100">
      {items.map((item) => {
        const done = checked.has(item.id);
        return (
          <li key={item.id} className="flex items-start gap-3 py-2.5">
            <input
              type="checkbox"
              checked={done}
              onChange={() => toggle(item.id)}
              className="mt-1 h-5 w-5 shrink-0 accent-emerald-700"
              aria-label={item.primary}
            />
            <div className={`min-w-0 flex-1 ${done ? "text-stone-400 line-through" : ""}`}>
              <p className="font-medium">{item.primary}</p>
              {item.secondary && <p className="text-sm text-stone-500">{item.secondary}</p>}
              {item.warning && !done && <p className="mt-0.5 text-xs font-medium text-amber-700">{item.warning}</p>}
            </div>
            <div className="shrink-0 text-right text-sm">
              {item.meta && <p className="font-medium">{item.meta}</p>}
              {item.href && (
                <a href={item.href} target="_blank" rel="noreferrer" className="text-xs text-emerald-700 hover:underline">
                  Tesco
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
