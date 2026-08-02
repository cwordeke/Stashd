"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ToastTone = "success" | "error" | "info";

interface ToastState {
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: ToastState | null;
  showToast: (message: string, tone?: ToastTone) => void;
  clearToast: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const clearToast = useCallback(() => setToast(null), []);

  const showToast = useCallback((message: string, tone: ToastTone = "info") => {
    setToast({ message, tone });
    window.setTimeout(() => {
      setToast((current) =>
        current?.message === message ? null : current
      );
    }, 3200);
  }, []);

  const value = useMemo(
    () => ({ toast, showToast, clearToast }),
    [toast, showToast, clearToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <div
          role="status"
          className={`fixed bottom-5 left-1/2 z-[60] max-w-sm -translate-x-1/2 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${
            toast.tone === "success"
              ? "border-emerald-700/60 bg-emerald-950/90 text-emerald-100"
              : toast.tone === "error"
                ? "border-red-700/60 bg-red-950/90 text-red-100"
                : "border-zinc-700 bg-zinc-900/95 text-zinc-100"
          }`}
        >
          {toast.message}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
