/** Shown only on recipes confirmed to contain no gluten. */
export function CeliacChip({ size = "sm" }: { size?: "sm" | "md" }) {
  const pad = size === "md" ? "px-2.5 text-xs" : "px-2 text-[11px]";
  return (
    <span className={`rounded-full bg-lime-100 py-0.5 font-semibold text-lime-900 ${pad}`}>Celiac safe</span>
  );
}
