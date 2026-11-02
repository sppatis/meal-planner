"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { logout } from "@/app/login/actions";

const LINKS = [
  { href: "/", label: "Plan", match: (p: string) => p === "/" || p.startsWith("/week/") },
  { href: "/plans", label: "Plans", match: (p: string) => p.startsWith("/plans") },
  { href: "/recipes", label: "Recipes", match: (p: string) => p.startsWith("/recipes") || p.startsWith("/recipe/") },
  { href: "/prices", label: "Prices", match: (p: string) => p.startsWith("/prices") },
];

/** Matches Tailwind's `md` breakpoint, where the inline links take over from the drawer. */
const DESKTOP = "(min-width: 48rem)";

export function SiteNav({ householdName, canSignOut }: { householdName: string; canSignOut: boolean }) {
  const pathname = usePathname();
  const drawer = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const drawerId = useId();
  const titleId = useId();

  const close = () => drawer.current?.close();

  useEffect(() => {
    drawer.current?.close();
  }, [pathname]);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP);
    const onChange = () => mq.matches && drawer.current?.close();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function openDrawer() {
    drawer.current?.showModal();
    setOpen(true);
  }

  const signOut = canSignOut && (
    <form action={logout}>
      <button
        className="w-full rounded-lg px-3 py-2 text-left text-stone-500 hover:bg-stone-100 hover:text-stone-800 md:w-auto"
        title={`Signed in as ${householdName}`}
      >
        <span className="text-stone-400">{householdName} · </span>Sign out
      </button>
    </form>
  );

  return (
    <>
      <nav aria-label="Main" className="hidden items-center gap-1 text-sm font-medium md:flex">
        {LINKS.map((l) => {
          const current = l.match(pathname);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={current ? "page" : undefined}
              className={`rounded-lg px-3 py-2 ${current ? "bg-emerald-50 text-emerald-800" : "hover:bg-stone-100"}`}
            >
              {l.label}
            </Link>
          );
        })}
        {signOut}
      </nav>

      <button
        type="button"
        onClick={openDrawer}
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={drawerId}
        className="-mr-2 rounded-lg p-2 text-stone-700 hover:bg-stone-100 md:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-2" aria-hidden>
          <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      <dialog
        ref={drawer}
        id={drawerId}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === drawer.current && close()}
        className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-[min(20rem,85vw)] max-w-none translate-x-full border-0 bg-white p-0 shadow-xl transition-[translate,display,overlay] transition-discrete duration-300 ease-out backdrop:bg-stone-900/0 backdrop:transition-[background-color,display,overlay] backdrop:transition-discrete backdrop:duration-300 open:translate-x-0 open:backdrop:bg-stone-900/40 starting:open:translate-x-full starting:open:backdrop:bg-stone-900/0 motion-reduce:transition-none md:hidden"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-(--header-h) shrink-0 items-center justify-between border-b border-stone-200 px-4">
            <h2 id={titleId} className="text-lg font-bold">
              Menu
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="Close menu"
              className="-mr-2 rounded-lg p-2 text-stone-700 hover:bg-stone-100"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-2" aria-hidden>
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <nav aria-label="Main" className="flex-1 overflow-y-auto p-3">
            <ul className="space-y-1">
              {LINKS.map((l) => {
                const current = l.match(pathname);
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={close}
                      aria-current={current ? "page" : undefined}
                      className={`block rounded-xl px-4 py-3 text-base font-medium ${
                        current ? "bg-emerald-50 text-emerald-800" : "text-stone-800 hover:bg-stone-100"
                      }`}
                    >
                      {l.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          {signOut && <div className="border-t border-stone-200 p-3 text-sm">{signOut}</div>}
        </div>
      </dialog>
    </>
  );
}
