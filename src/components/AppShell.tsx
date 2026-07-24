"use client";

import { SearchUIProvider } from "@/context/SearchUIContext";
import { StashProvider } from "@/context/StashContext";
import Navbar from "@/components/Navbar";
import SearchModal from "@/components/SearchModal";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SearchUIProvider>
      <StashProvider>
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-600">
            Stashd — track everything you love in one place
          </footer>
        </div>
        <SearchModal />
      </StashProvider>
    </SearchUIProvider>
  );
}
