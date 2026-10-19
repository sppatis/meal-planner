"use client";

import { useEffect } from "react";

export function ScrollToWeek({ week }: { week: number }) {
  useEffect(() => {
    if (week > 0 && !window.location.hash) {
      document.getElementById(`week-${week + 1}`)?.scrollIntoView({ behavior: "instant", block: "start" });
    }
  }, [week]);
  return null;
}
