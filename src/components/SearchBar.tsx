"use client";

import { useRouter } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useNavigationPending } from "@/context/NavigationPendingContext";
import { flattenRanked, searchAllMedia } from "@/lib/search-client";
import {
  MEDIA_TYPE_LABELS,
  mediaDetailPath,
  mediaKey,
  type UnifiedMediaItem,
} from "@/lib/types";
import { cn } from "@/lib/cn";

const DEBOUNCE_MS = 280;
const SUGGESTION_LIMIT = 8;

export default function SearchBar() {
  const router = useRouter();
  const { beginNavigation } = useNavigationPending();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<UnifiedMediaItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions([]);
      setLoading(false);
      setActiveIndex(-1);
      return;
    }

    setLoading(true);
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      void (async () => {
        const columns = await searchAllMedia(trimmed, {
          limit: SUGGESTION_LIMIT,
          signal: controller.signal,
        });
        if (requestId !== requestIdRef.current) return;
        setSuggestions(flattenRanked(trimmed, columns, SUGGESTION_LIMIT));
        setLoading(false);
        setActiveIndex(-1);
        setOpen(true);
      })();
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function goToSearch(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    setOpen(false);
    setActiveIndex(-1);
    const href = `/search?q=${encodeURIComponent(trimmed)}`;
    beginNavigation(href);
    router.push(href);
  }

  function goToItem(item: UnifiedMediaItem) {
    const href = mediaDetailPath(item.mediaType, item.id);
    setOpen(false);
    setActiveIndex(-1);
    setQuery("");
    setSuggestions([]);
    beginNavigation(href);
    router.push(href);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    goToSearch(query);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (!open || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    }
  }

  const showDropdown =
    open && query.trim().length > 0 && (loading || suggestions.length > 0);

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1 md:max-w-xs lg:max-w-sm">
      <form onSubmit={handleSubmit} className="w-full">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search…"
          aria-label="Search media"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={showDropdown}
          aria-activedescendant={
            activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
          }
          role="combobox"
          autoComplete="off"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 outline-none ring-emerald-500/40 placeholder:text-zinc-500 focus:border-emerald-600 focus:ring-2"
        />
      </form>

      {showDropdown ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-[min(360px,70vh)] overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 py-1 shadow-xl shadow-black/40"
        >
          {loading && suggestions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-zinc-500">Searching…</li>
          ) : null}

          {suggestions.map((item, index) => {
            const active = index === activeIndex;
            return (
              <li
                key={mediaKey(item)}
                id={`${listId}-option-${index}`}
                role="option"
                aria-selected={active}
              >
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => goToItem(item)}
                  className={cn(
                    "flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left transition",
                    active ? "bg-zinc-800" : "hover:bg-zinc-900"
                  )}
                >
                  <span className="min-w-0 truncate text-sm text-zinc-100">
                    {item.title}
                  </span>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {MEDIA_TYPE_LABELS[item.mediaType]}
                  </span>
                </button>
              </li>
            );
          })}

          {!loading && suggestions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-zinc-500">No matches</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
