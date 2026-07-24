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
import {
  emptyShelves,
  mediaKey,
  type MediaType,
  type StashShelves,
  type UnifiedMediaItem,
} from "@/lib/types";

const STORAGE_KEY = "stashd:my-stash";

interface StashState {
  shelves: StashShelves;
  addToStash: (item: UnifiedMediaItem) => { ok: boolean; message: string };
  removeFromStash: (type: MediaType, index: number) => void;
  isInStash: (item: UnifiedMediaItem) => boolean;
}

const StashContext = createContext<StashState | null>(null);

export function StashProvider({ children }: { children: ReactNode }) {
  const [shelves, setShelves] = useState<StashShelves>(emptyShelves);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StashShelves;
        setShelves({ ...emptyShelves(), ...parsed });
      }
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shelves));
  }, [shelves, hydrated]);

  const isInStash = useCallback(
    (item: UnifiedMediaItem) => {
      return shelves[item.mediaType].some(
        (slot) => slot && mediaKey(slot) === mediaKey(item)
      );
    },
    [shelves]
  );

  const addToStash = useCallback(
    (item: UnifiedMediaItem) => {
      if (isInStash(item)) {
        return { ok: false, message: "Already in your Top 4" };
      }

      const shelf = shelves[item.mediaType];
      const emptyIndex = shelf.findIndex((slot) => slot === null);

      if (emptyIndex === -1) {
        return {
          ok: false,
          message: "Top 4 is full — remove an item first",
        };
      }

      setShelves((prev) => {
        const next = { ...prev, [item.mediaType]: [...prev[item.mediaType]] };
        next[item.mediaType][emptyIndex] = item;
        return next;
      });

      return { ok: true, message: "Added to your stash" };
    },
    [shelves, isInStash]
  );

  const removeFromStash = useCallback((type: MediaType, index: number) => {
    setShelves((prev) => {
      const next = { ...prev, [type]: [...prev[type]] };
      next[type][index] = null;
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ shelves, addToStash, removeFromStash, isInStash }),
    [shelves, addToStash, removeFromStash, isInStash]
  );

  return (
    <StashContext.Provider value={value}>{children}</StashContext.Provider>
  );
}

export function useStash() {
  const ctx = useContext(StashContext);
  if (!ctx) {
    throw new Error("useStash must be used within StashProvider");
  }
  return ctx;
}
