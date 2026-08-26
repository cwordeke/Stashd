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
import { useRouter } from "next/navigation";
import {
  addStashItem as addStashItemAction,
  getUserStash,
  removeStashItem as removeStashItemAction,
  reorderStashItems as reorderStashItemsAction,
  type StashItem,
} from "@/app/actions/stash";
import {
  STASH_TOP_N,
  countByMediaType,
  reorderItemsByType,
  shelvesFromItems,
} from "@/lib/stash-utils";
import {
  mediaKey,
  type MediaType,
  type StashShelves,
  type UnifiedMediaItem,
} from "@/lib/types";

type OptimisticAction =
  | { type: "add"; item: StashItem }
  | { type: "remove"; stashId: string; mediaKey?: string }
  | { type: "reorder"; mediaType: MediaType; orderedStashIds: string[] };

interface StashState {
  shelves: StashShelves;
  isPending: boolean;
  pendingKey: string | null;
  /** False until auth + initial stash fetch have finished */
  stashReady: boolean;
  addToStash: (item: UnifiedMediaItem) => void;
  removeFromStash: (stashId: string, item?: UnifiedMediaItem) => void;
  reorderStash: (mediaType: MediaType, orderedStashIds: string[]) => void;
  isInStash: (item: UnifiedMediaItem) => boolean;
  getCategoryCount: (mediaType: MediaType) => number;
}

const StashContext = createContext<StashState | null>(null);

function applyOptimistic(
  state: StashItem[],
  action: OptimisticAction
): StashItem[] {
  if (action.type === "add") {
    if (state.some((item) => mediaKey(item) === mediaKey(action.item))) {
      return state;
    }
    return [...state, action.item];
  }

  if (action.type === "reorder") {
    return reorderItemsByType(state, action.mediaType, action.orderedStashIds);
  }

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
  const router = useRouter();
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

  const isInStash = useCallback(
    (item: UnifiedMediaItem) =>
      optimisticItems.some((entry) => mediaKey(entry) === mediaKey(item)),
    [optimisticItems]
  );

  const getCategoryCount = useCallback(
    (mediaType: MediaType) => countByMediaType(optimisticItems, mediaType),
    [optimisticItems]
  );

  const addToStash = useCallback(
    (item: UnifiedMediaItem) => {
      if (!isAuthenticated) {
        const next = encodeURIComponent(
          `${window.location.pathname}${window.location.search}`
        );
        router.push(`/login?next=${next}`);
        return;
      }

      if (isInStash(item)) return;

      if (countByMediaType(optimisticItems, item.mediaType) >= STASH_TOP_N) {
        return;
      }

      const key = mediaKey(item);
      const optimisticItem: StashItem = {
        ...item,
        stashId: `optimistic-${key}`,
        position: countByMediaType(optimisticItems, item.mediaType),
      };

      setPendingKey(key);
      startTransition(async () => {
        dispatchOptimistic({ type: "add", item: optimisticItem });

        const result = await addStashItemAction(item);
        setPendingKey(null);

        if (!result.ok || !result.item) {
          return;
        }

        setItems((prev) => {
          if (prev.some((entry) => mediaKey(entry) === key)) return prev;
          return [...prev, result.item!];
        });
      });
    },
    [
      dispatchOptimistic,
      isAuthenticated,
      isInStash,
      optimisticItems,
      router,
    ]
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

  const reorderStash = useCallback(
    (mediaType: MediaType, orderedStashIds: string[]) => {
      if (!orderedStashIds.length) return;

      setItems((prev) =>
        reorderItemsByType(prev, mediaType, orderedStashIds)
      );

      startTransition(async () => {
        dispatchOptimistic({
          type: "reorder",
          mediaType,
          orderedStashIds,
        });

        const result = await reorderStashItemsAction(
          mediaType,
          orderedStashIds
        );

        if (!result.ok) {
          const nextItems = await getUserStash();
          setItems(nextItems);
        }
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
      addToStash,
      removeFromStash,
      reorderStash,
      isInStash,
      getCategoryCount,
    }),
    [
      shelves,
      isPending,
      pendingKey,
      stashReady,
      addToStash,
      removeFromStash,
      reorderStash,
      isInStash,
      getCategoryCount,
    ]
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
