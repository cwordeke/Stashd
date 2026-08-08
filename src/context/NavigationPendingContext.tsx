"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

interface NavigationPendingContextValue {
  pendingHref: string | null;
  /** Path used for active nav styling (pending takes priority). */
  displayPath: string;
  beginNavigation: (href: string) => void;
  clearNavigation: () => void;
}

const NavigationPendingContext =
  createContext<NavigationPendingContextValue | null>(null);

function pathsMatch(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavigationPendingProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const clearNavigation = useCallback(() => setPendingHref(null), []);

  const beginNavigation = useCallback(
    (href: string) => {
      if (pathsMatch(pathname, href)) return;
      setPendingHref(href);
    },
    [pathname]
  );

  useEffect(() => {
    if (!pendingHref) return;
    if (pathsMatch(pathname, pendingHref)) {
      setPendingHref(null);
    }
  }, [pathname, pendingHref]);

  // Safety: don't leave a stuck pending state if navigation is cancelled.
  useEffect(() => {
    if (!pendingHref) return;
    const timer = window.setTimeout(() => setPendingHref(null), 12_000);
    return () => window.clearTimeout(timer);
  }, [pendingHref]);

  const value = useMemo(
    () => ({
      pendingHref,
      displayPath: pendingHref ?? pathname,
      beginNavigation,
      clearNavigation,
    }),
    [pendingHref, pathname, beginNavigation, clearNavigation]
  );

  return (
    <NavigationPendingContext.Provider value={value}>
      {children}
    </NavigationPendingContext.Provider>
  );
}

export function useNavigationPending() {
  const ctx = useContext(NavigationPendingContext);
  if (!ctx) {
    throw new Error(
      "useNavigationPending must be used within NavigationPendingProvider"
    );
  }
  return ctx;
}
