"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  getUserStash,
  removeStashItem as removeStashItemAction,
  type StashItem,
} from "@/app/actions/stash";
import { shelvesFromItems } from "@/lib/stash-utils";
import {
  mediaKey,
  type StashShelves,
  type UnifiedMediaItem,
} from "@/lib/types";

type OptimisticAction = {
  type: "remove";
  stashId: string;
  mediaKey?: string;
};

interface StashState {
  shelves: StashShelves;
  isPending: boolean;
  pendingKey: string | null;
  /** False until auth + initial stash fetch have finished */
  stashReady: boolean;
  removeFromStash: (stashId: string, item?: UnifiedMediaItem) => void;
}

const StashContext = createContext<StashState | null>(null);

function applyOptimistic(
  state: StashItem[],
  action: OptimisticAction
): StashItem[] {
  return state.filter((item) => item.stashId !== action.stashId);
}

interface StashProviderProps {
  children: ReactNode;
  isAuthenticated?: boolean;
  authReady?: boolean;
}

export function StashProvider({
  children,
  isAuthenticated = false,
  authReady = false,
}: StashProviderProps) {
  const [isPending, startTransition] = useTransition();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [items, setItems] = useState<StashItem[]>([]);
  const [stashReady, setStashReady] = useState(false);

  useEffect(() => {
    if (!authReady) return;

    if (!isAuthenticated) {
      setItems([]);
      setStashReady(true);
      return;
    }

    let cancelled = false;
    setStashReady(false);

    void getUserStash().then((nextItems) => {
      if (!cancelled) {
        setItems(nextItems);
        setStashReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [authReady, isAuthenticated]);

  const [optimisticItems, dispatchOptimistic] = useOptimistic(
    items,
    applyOptimistic
  );

  const shelves = useMemo(
    () => shelvesFromItems(optimisticItems),
    [optimisticItems]
  );

  const removeFromStash = useCallback(
    (stashId: string, item?: UnifiedMediaItem) => {
      setPendingKey(stashId);
      startTransition(async () => {
        dispatchOptimistic({
          type: "remove",
          stashId,
          mediaKey: item ? mediaKey(item) : undefined,
        });

        const result = await removeStashItemAction(stashId);
        setPendingKey(null);

        if (!result.ok) {
          return;
        }

        setItems((prev) => prev.filter((entry) => entry.stashId !== stashId));
      });
    },
    [dispatchOptimistic]
  );

  const value = useMemo(
    () => ({
      shelves,
      isPending,
      pendingKey,
      stashReady,
      removeFromStash,
    }),
    [shelves, isPending, pendingKey, stashReady, removeFromStash]
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
