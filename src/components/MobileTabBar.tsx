"use client";

import NavLink from "@/components/NavLink";
import { profilePath, type AuthUserSummary } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { useNavigationPending } from "@/context/NavigationPendingContext";

interface MobileTabBarProps {
  user: AuthUserSummary | null;
}

export default function MobileTabBar({ user }: MobileTabBarProps) {
  const { displayPath } = useNavigationPending();
  const profileHref = user ? profilePath(user.username) : "/login";

  const tabs = [
    {
      href: "/",
      label: "Home",
      active: displayPath === "/",
      icon: HomeIcon,
    },
    {
      href: "/search",
      label: "Search",
      active:
        displayPath === "/search" || displayPath.startsWith("/search?"),
      icon: SearchIcon,
    },
    {
      href: profileHref,
      label: user ? "Profile" : "Sign in",
      active:
        displayPath === profileHref ||
        displayPath.startsWith(`${profileHref}/`) ||
        displayPath === "/settings" ||
        displayPath.startsWith("/settings/") ||
        (profileHref === "/login" && displayPath === "/login"),
      icon: ProfileIcon,
    },
  ] as const;

  return (
    <nav
      aria-label="Mobile"
      data-tutorial="mobile-nav"
      className="fixed inset-x-0 bottom-0 z-50 flex border-t border-white/[0.06] bg-[rgba(10,10,11,0.92)] pb-[env(safe-area-inset-bottom)] backdrop-blur-[12px] md:hidden"
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.label}
          href={tab.href}
          {...(tab.href === profileHref
            ? { "data-tutorial": "profile-link" }
            : {})}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 min-h-11 py-3 text-[11px] font-medium transition-colors",
            tab.active ? "text-emerald-400" : "text-zinc-500",
            !user && tab.label === "Sign in" && !tab.active && "text-emerald-500/80"
          )}
        >
          <tab.icon className="h-5 w-5" />
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.5h-6V20.5H5.5A1.5 1.5 0 0 1 4 19v-8.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="m16 16 4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="8.25" r="3.25" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M6.5 19.5c.9-2.75 3-4.5 5.5-4.5s4.6 1.75 5.5 4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
