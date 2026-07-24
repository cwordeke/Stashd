"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { useSearchUI } from "@/context/SearchUIContext";

export default function Navbar() {
  const pathname = usePathname();
  const { openSearch } = useSearchUI();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="shrink-0 text-lg font-semibold tracking-tight text-white transition hover:text-emerald-400"
        >
          Stashd
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm transition",
                  active
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => openSearch()}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
          >
            Search
          </button>

          <Link
            href="/profile"
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm transition",
              pathname === "/profile"
                ? "bg-emerald-600 text-white"
                : "border border-zinc-700 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800"
            )}
          >
            Profile
          </Link>
        </div>
      </div>

      {/* Mobile category strip */}
      <nav className="flex gap-1 overflow-x-auto border-t border-zinc-900 px-3 py-2 md:hidden">
        {NAV_LINKS.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs transition",
                active
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
