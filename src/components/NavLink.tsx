"use client";

import Link, { type LinkProps } from "next/link";
import type { ReactNode, MouseEvent } from "react";
import { useNavigationPending } from "@/context/NavigationPendingContext";
import { isAuthSensitivePrefetchPath } from "@/lib/route-policy";

type NavLinkProps = LinkProps & {
  children: ReactNode;
  className?: string;
  title?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export default function NavLink({
  href,
  onClick,
  children,
  ...props
}: NavLinkProps) {
  const { beginNavigation } = useNavigationPending();
  const target = typeof href === "string" ? href : href.pathname || "/";
  const prefetchEnabled = !isAuthSensitivePrefetchPath(target);

  return (
    <Link
      href={href}
      prefetch={prefetchEnabled}
      onClick={(event) => {
        if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
          beginNavigation(target);
        }
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </Link>
  );
}
