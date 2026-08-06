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
  type StashItem,
} from "@/app/actions/stash";
import { useToast } from "@/context/ToastContext";
import {
  STASH_TOP_N,
  countByMediaType,
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
  | { type: "remove"; stashId: string; mediaKey?: string };

interface StashState {
  shelves: StashShelves;
  isPending: boolean;
  pendingKey: string | null;
  addToStash: (item: UnifiedMediaItem) => void;
  removeFromStash: (stashId: string, item?: UnifiedMediaItem) => void;
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
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [items, setItems] = useState<StashItem[]>([]);

  useEffect(() => {
    if (!authReady) return;

    if (!isAuthenticated) {
      setItems([]);
      return;
    }

    let cancelled = false;

    void getUserStash().then((nextItems) => {
      if (!cancelled) setItems(nextItems);
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
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}`
            : "/"
        );
        router.push(`/login?next=${next}`);
        return;
      }

      if (isInStash(item)) {
        showToast("Already in your Top 4", "error");
        return;
      }

      const categoryCount = countByMediaType(optimisticItems, item.mediaType);
      if (categoryCount >= STASH_TOP_N) {
        showToast(
          "This category is already full! Remove an item first.",
          "error"
        );
        return;
      }

      const key = mediaKey(item);
      const optimisticItem: StashItem = {
        ...item,
        stashId: `optimistic-${key}`,
      };

      setPendingKey(key);
      startTransition(async () => {
        dispatchOptimistic({ type: "add", item: optimisticItem });

        const result = await addStashItemAction(item);
        setPendingKey(null);

        if (!result.ok || !result.item) {
          showToast(
            result.ok
              ? "Could not add item"
              : result.message ||
                  "This category is already full! Remove an item first.",
            "error"
          );
          return;
        }

        setItems((prev) => {
          if (prev.some((entry) => mediaKey(entry) === key)) return prev;
          return [...prev, result.item!];
        });
        showToast(result.message, "success");
      });
    },
    [
      dispatchOptimistic,
      isAuthenticated,
      isInStash,
      optimisticItems,
      router,
      showToast,
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
          showToast(result.message, "error");
          return;
        }

        setItems((prev) => prev.filter((entry) => entry.stashId !== stashId));
        showToast(result.message, "success");
      });
    },
    [dispatchOptimistic, showToast]
  );

  const value = useMemo(
    () => ({
      shelves,
      isPending,
      pendingKey,
      addToStash,
      removeFromStash,
      isInStash,
      getCategoryCount,
    }),
    [
      shelves,
      isPending,
      pendingKey,
      addToStash,
      removeFromStash,
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
