"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium hover:border-emerald-600"
    >
      Print
    </button>
  );
}
