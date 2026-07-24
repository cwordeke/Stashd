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
import type { MediaType } from "@/lib/types";

interface SearchUIState {
  isOpen: boolean;
  filterType: MediaType | null;
  openSearch: (filterType?: MediaType | null) => void;
  closeSearch: () => void;
  setFilterType: (filterType: MediaType | null) => void;
}

const SearchUIContext = createContext<SearchUIState | null>(null);

export function SearchUIProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterType, setFilterType] = useState<MediaType | null>(null);

  const openSearch = useCallback((type: MediaType | null = null) => {
    setFilterType(type);
    setIsOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
    setFilterType(null);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
        setFilterType(null);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      filterType,
      openSearch,
      closeSearch,
      setFilterType,
    }),
    [isOpen, filterType, openSearch, closeSearch]
  );

  return (
    <SearchUIContext.Provider value={value}>{children}</SearchUIContext.Provider>
  );
}

export function useSearchUI() {
  const ctx = useContext(SearchUIContext);
  if (!ctx) {
    throw new Error("useSearchUI must be used within SearchUIProvider");
  }
  return ctx;
}
