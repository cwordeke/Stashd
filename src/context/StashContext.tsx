"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  addStashItem as addStashItemAction,
  removeStashItem as removeStashItemAction,
} from "@/app/actions/stash";
import { useToast } from "@/context/ToastContext";
import { mediaKey, type UnifiedMediaItem } from "@/lib/types";

interface StashState {
  isPending: boolean;
  pendingKey: string | null;
  addToStash: (item: UnifiedMediaItem) => void;
  removeFromStash: (stashId: string, item?: UnifiedMediaItem) => void;
  isInStash: (item: UnifiedMediaItem) => boolean;
}

const StashContext = createContext<StashState | null>(null);

interface StashProviderProps {
  children: ReactNode;
  initialKeys?: string[];
}

export function StashProvider({
  children,
  initialKeys = [],
}: StashProviderProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [stashKeys, setStashKeys] = useState(() => new Set(initialKeys));
  const initialKeySignature = initialKeys.slice().sort().join("|");

  useEffect(() => {
    setStashKeys(new Set(initialKeys));
    // Sync when server keys change after router.refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKeySignature]);

  const isInStash = useCallback(
    (item: UnifiedMediaItem) => stashKeys.has(mediaKey(item)),
    [stashKeys]
  );

  const addToStash = useCallback(
    (item: UnifiedMediaItem) => {
      const key = mediaKey(item);
      setPendingKey(key);
      startTransition(async () => {
        const result = await addStashItemAction(item);
        setPendingKey(null);

        if (!result.ok) {
          showToast(result.message, "error");
          return;
        }

        setStashKeys((prev) => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
        showToast(result.message, "success");
        router.refresh();
      });
    },
    [router, showToast]
  );

  const removeFromStash = useCallback(
    (stashId: string, item?: UnifiedMediaItem) => {
      setPendingKey(stashId);
      startTransition(async () => {
        const result = await removeStashItemAction(stashId);
        setPendingKey(null);

        if (!result.ok) {
          showToast(result.message, "error");
          return;
        }

        if (item) {
          setStashKeys((prev) => {
            const next = new Set(prev);
            next.delete(mediaKey(item));
            return next;
          });
        }
        showToast(result.message, "success");
        router.refresh();
      });
    },
    [router, showToast]
  );

  const value = useMemo(
    () => ({
      isPending,
      pendingKey,
      addToStash,
      removeFromStash,
      isInStash,
    }),
    [isPending, pendingKey, addToStash, removeFromStash, isInStash]
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
