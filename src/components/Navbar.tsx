"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import NavLink from "@/components/NavLink";
import { navLinksForPreferences } from "@/lib/media-order";
import { cn } from "@/lib/cn";
import { profilePath, type AuthUserSummary } from "@/lib/auth";
import { useNavigationPending } from "@/context/NavigationPendingContext";
import SearchModal from "@/components/SearchModal";
import { createClient } from "@/utils/supabase/client";

interface NavbarProps {
  user: AuthUserSummary | null;
}

export default function Navbar({ user }: NavbarProps) {
  const { displayPath } = useNavigationPending();
  const profileHref = profilePath(user?.username);
  const onProfile =
    Boolean(user?.username) && displayPath === `/u/${user?.username}`;
  const links = navLinksForPreferences(user?.preferredCategories);

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[rgba(10,10,11,0.85)] backdrop-blur-[12px]">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="flex h-14 items-center md:h-16">
          <NavLink
            href="/"
            className="shrink-0 text-[17px] font-bold tracking-[-0.035em] text-white"
          >
            Stashd
          </NavLink>

          <HeaderNav
            links={links}
            displayPath={displayPath}
            className="ml-6 hidden h-full lg:ml-10 md:flex"
          />

          <div
            className="ml-auto flex items-center gap-2 sm:gap-3"
            data-tutorial="nav-actions"
          >
            <div className="hidden md:block">
              <SearchModal />
            </div>

            {user ? (
              <div className="hidden md:block">
                <AccountMenu
                  user={user}
                  profileHref={profileHref}
                  onProfile={onProfile}
                />
              </div>
            ) : (
              <NavLink
                href="/login"
                className="inline-flex h-9 shrink-0 items-center rounded-md bg-emerald-600 px-3 text-[12px] font-semibold text-white shadow-sm shadow-emerald-950/30 transition-colors hover:bg-emerald-500 sm:text-[13px]"
              >
                Sign in
              </NavLink>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function HeaderNav({
  links,
  displayPath,
  className,
}: {
  links: { href: string; label: string }[];
  displayPath: string;
  className?: string;
}) {
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<Map<string, HTMLSpanElement>>(new Map());
  const [indicator, setIndicator] = useState({
    left: 0,
    width: 0,
    ready: false,
  });

  const activeHref =
    links.find((link) =>
      link.href === "/"
        ? displayPath === "/"
        : displayPath.startsWith(link.href)
    )?.href ?? null;

  const updateIndicator = useCallback(() => {
    const nav = navRef.current;
    const activeEl = activeHref ? itemRefs.current.get(activeHref) : null;
    if (!nav || !activeEl) return;

    const navRect = nav.getBoundingClientRect();
    const tabRect = activeEl.getBoundingClientRect();
    if (tabRect.width === 0) return;

    setIndicator({
      left: tabRect.left - navRect.left + nav.scrollLeft,
      width: tabRect.width,
      ready: true,
    });
  }, [activeHref]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const onResize = () => updateIndicator();
    window.addEventListener("resize", onResize);
    nav.addEventListener("scroll", onResize);

    const activeEl = activeHref ? itemRefs.current.get(activeHref) : null;
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(onResize)
        : null;
    ro?.observe(nav);
    if (activeEl) ro?.observe(activeEl);

    return () => {
      window.removeEventListener("resize", onResize);
      nav.removeEventListener("scroll", onResize);
      ro?.disconnect();
    };
  }, [updateIndicator, activeHref]);

  return (
    <nav
      ref={navRef}
      className={cn(
        "relative items-stretch gap-7 overflow-x-auto",
        className
      )}
    >
      {links.map((link) => {
        const active = link.href === activeHref;

        return (
          <NavLink
            key={link.href}
            href={link.href}
            className={cn(
              "relative flex shrink-0 items-center text-[13px] font-medium tracking-[0.06em] uppercase transition-colors duration-200",
              active ? "text-white" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <span
              ref={(el) => {
                if (el) itemRefs.current.set(link.href, el);
                else itemRefs.current.delete(link.href);
              }}
            >
              {link.label}
            </span>
          </NavLink>
        );
      })}

      <span
        className={cn(
          "pointer-events-none absolute bottom-0 h-0.5 bg-emerald-500",
          indicator.ready
            ? "opacity-100 transition-[left,width,opacity] duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            : "opacity-0"
        )}
        style={{ left: indicator.left, width: indicator.width }}
        aria-hidden
      />
    </nav>
  );
}

function AccountMenu({
  user,
  profileHref,
  onProfile,
}: {
  user: AuthUserSummary;
  profileHref: string;
  onProfile: boolean;
}) {
  const router = useRouter();
  const { beginNavigation, displayPath } = useNavigationPending();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const onSettings =
    displayPath === "/settings" || displayPath.startsWith("/settings/");

  const label = user.username
    ? user.username
    : (user.name ?? user.email ?? "Profile");

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    beginNavigation("/");
    router.push("/");
    router.refresh();
    setSigningOut(false);
  }

  return (
    <div
      className="relative flex h-16 shrink-0 items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <NavLink
        href={profileHref}
        title={label}
        data-tutorial="profile-link"
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 text-zinc-200 transition-colors",
          "hover:bg-white/[0.05]",
          (open || onProfile || onSettings) && "bg-white/[0.05]"
        )}
      >
        <UserAvatar user={user} />
        <span className="hidden max-w-[7.5rem] truncate text-[13px] font-medium sm:inline">
          {user.username ? user.username : "Profile"}
        </span>
        <ChevronGlyph
          className={cn(
            "h-3 w-3 text-zinc-500 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </NavLink>

      {open ? (
        <div
          id={panelId}
          role="menu"
          aria-label="Account"
          className="absolute left-0 right-0 top-full z-50"
        >
          <div className="border border-white/10 bg-zinc-900">
            <NavLink
              href={profileHref}
              className={cn(
                "block px-3 py-2 text-[13px] text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white",
                onProfile && "bg-white/[0.06] text-white"
              )}
            >
              Profile
            </NavLink>
            <NavLink
              href="/settings"
              className={cn(
                "block px-3 py-2 text-[13px] text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white",
                onSettings && "bg-white/[0.06] text-white"
              )}
            >
              Settings
            </NavLink>
            <button
              type="button"
              role="menuitem"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className="block w-full px-3 py-2 text-left text-[13px] text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function UserAvatar({ user }: { user: AuthUserSummary }) {
  if (user.avatarUrl) {
    return (
      <Image
        key={user.avatarUrl}
        src={user.avatarUrl}
        alt={user.name ?? "User avatar"}
        width={32}
        height={32}
        className="h-8 w-8 rounded-full object-cover"
      />
    );
  }

  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
      {(user.username ?? user.name ?? user.email ?? "?")
        .charAt(0)
        .toUpperCase()}
    </span>
  );
}

function ChevronGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" fill="none" className={className} aria-hidden>
      <path
        d="M2.5 4.5 6 8l3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
