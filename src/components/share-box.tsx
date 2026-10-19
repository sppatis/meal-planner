"use client";

import { useState } from "react";

interface Props {
  title: string;
  shareUrl: string;
  nutritionText: string;
}

export function ShareBox({ title, shareUrl, nutritionText }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const isLocal = /localhost|127\.0\.0\.1/.test(shareUrl);

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  async function share() {
    if (navigator.share) {
      await navigator.share({ title, text: `${title}\n\n${nutritionText}`, url: shareUrl }).catch(() => {});
    } else {
      await copy(shareUrl, "link");
    }
  }

  return (
    <div className="rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-100">
      <h2 className="font-semibold text-sky-950">Log it in MyFitnessPal</h2>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-sky-900">
        <li>Copy the recipe link below.</li>
        <li>
          In MyFitnessPal, go to <b>Recipes</b>, then <b>Create a Recipe</b>, then <b>Add from web</b>, and paste the
          link.
        </li>
        <li>Check the ingredient matches, set servings to <b>3</b> and save. Then log 1 serving each.</li>
      </ol>
      <p className="mt-3 truncate rounded-lg bg-white px-3 py-2 font-mono text-xs text-stone-600 ring-1 ring-sky-100">
        {shareUrl}
      </p>
      {isLocal && (
        <p className="mt-1 text-xs text-amber-700">
          This is a local address. MyFitnessPal can only read the link once the app is deployed online.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => copy(shareUrl, "link")}
          className="rounded-lg bg-sky-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-800"
        >
          {copied === "link" ? "Copied!" : "Copy link"}
        </button>
        <button
          type="button"
          onClick={() => copy(nutritionText, "nutrition")}
          className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-sky-800 ring-1 ring-sky-200 hover:ring-sky-400"
        >
          {copied === "nutrition" ? "Copied!" : "Copy nutrition"}
        </button>
        <button
          type="button"
          onClick={share}
          className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-sky-800 ring-1 ring-sky-200 hover:ring-sky-400"
        >
          Share...
        </button>
      </div>
      <p className="mt-2 text-xs text-sky-800/80">
        Short on time? Use &quot;Copy nutrition&quot; and add it with MyFitnessPal&apos;s Quick Add.
      </p>
    </div>
  );
}
