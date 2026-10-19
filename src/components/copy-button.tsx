"use client";

import { useState } from "react";

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="no-print rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium hover:border-emerald-600"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
