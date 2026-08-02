"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { NAV_LINKS } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { profilePath, type AuthUserSummary } from "@/lib/auth";
import { useSearchUI } from "@/context/SearchUIContext";
import { createClient } from "@/utils/supabase/client";

interface NavbarProps {
  user: AuthUserSummary | null;
}

export default function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { openSearch } = useSearchUI();
  const [signingOut, setSigningOut] = useState(false);

  const profileHref = profilePath(user?.username);
  const onProfile =
    Boolean(user?.username) && pathname === `/u/${user?.username}`;

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
    setSigningOut(false);
  }

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

          {user ? (
            <>
              <Link
                href={profileHref}
                className={cn(
                  "hidden items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition sm:inline-flex",
                  onProfile
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                )}
                title={
                  user.username
                    ? `@${user.username}`
                    : (user.name ?? user.email ?? "Profile")
                }
              >
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={user.name ?? "User avatar"}
                    width={28}
                    height={28}
                    className="rounded-full"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
                    {(user.username ?? user.name ?? user.email ?? "?")
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                )}
                <span className="max-w-[8rem] truncate">
                  {user.username ? `@${user.username}` : "Profile"}
                </span>
              </Link>

              <Link
                href={profileHref}
                className="inline-flex sm:hidden"
                title="Profile"
              >
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={user.name ?? "User avatar"}
                    width={28}
                    height={28}
                    className="rounded-full"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
                    {(user.username ?? user.name ?? user.email ?? "?")
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                )}
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800 disabled:opacity-50"
              >
                {signingOut ? "…" : "Sign Out"}
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-500"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>

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
