"use client";

import NavLink from "@/components/NavLink";
import { cn } from "@/lib/cn";

interface AuthPromptButtonsProps {
  className?: string;
  size?: "sm" | "md";
  primaryLabel?: string;
}

export default function AuthPromptButtons({
  className,
  size = "md",
  primaryLabel = "Create account",
}: AuthPromptButtonsProps) {
  const button =
    size === "sm"
      ? "h-8 px-3 text-[12px]"
      : "h-10 px-4 text-[13px] sm:text-[14px]";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <NavLink
        href="/login?mode=signup"
        className={cn(
          button,
          "inline-flex items-center justify-center rounded-md bg-emerald-600 font-medium text-white",
          "shadow-md shadow-emerald-950/30 transition-colors hover:bg-emerald-500"
        )}
      >
        {primaryLabel}
      </NavLink>
      <NavLink
        href="/login"
        className={cn(
          button,
          "inline-flex items-center justify-center rounded-md border border-white/20 bg-white/5 font-medium text-white",
          "backdrop-blur-sm transition-colors hover:border-white/30 hover:bg-white/10"
        )}
      >
        Sign in
      </NavLink>
    </div>
  );
}
