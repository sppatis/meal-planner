"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setActivePlan } from "@/app/actions";

export function SetActivePlanButton({ planId, className }: { planId: string; className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setActivePlan(planId);
          router.push("/");
        })
      }
      className={
        className ??
        "btn-primary"
      }
    >
      {pending ? "Switching..." : "Make active"}
    </button>
  );
}
