"use client";

import { SearchUIProvider } from "@/context/SearchUIContext";
import { StashProvider } from "@/context/StashContext";
import { ToastProvider } from "@/context/ToastContext";
import Navbar from "@/components/Navbar";
import SearchModal from "@/components/SearchModal";
import type { AuthUserSummary } from "@/lib/auth";

interface AppShellProps {
  children: React.ReactNode;
  user: AuthUserSummary | null;
  initialStashKeys?: string[];
}

export default function AppShell({
  children,
  user,
  initialStashKeys = [],
}: AppShellProps) {
  return (
    <ToastProvider>
      <SearchUIProvider>
        <StashProvider initialKeys={initialStashKeys}>
          <div className="flex min-h-screen flex-col">
            <Navbar user={user} />
            <main className="flex-1">{children}</main>
            <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-600">
              Stashd — track everything you love in one place
            </footer>
          </div>
          <SearchModal />
        </StashProvider>
      </SearchUIProvider>
    </ToastProvider>
  );
}
