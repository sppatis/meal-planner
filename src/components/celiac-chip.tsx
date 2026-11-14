/** Gluten-free label. Callers show it only for a confirmed recipe inside a celiac-safe plan. */
export function CeliacChip({ size = "sm" }: { size?: "sm" | "md" }) {
  const pad = size === "md" ? "px-2.5 text-xs" : "px-2 text-[11px]";
  return (
    <span className={`rounded-full bg-lime-100 py-0.5 font-semibold text-lime-900 ${pad}`}>Gluten Free</span>
  );
}
