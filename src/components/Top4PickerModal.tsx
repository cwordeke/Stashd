"use client";

import Image from "next/image";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getLoggedMediaForType } from "@/app/actions/stash";
import { useStash } from "@/context/StashContext";
import { cn } from "@/lib/cn";
import { searchAllMedia } from "@/lib/search-client";
import {
  MEDIA_TYPE_LABELS,
  mediaKey,
  type MediaType,
  type UnifiedMediaItem,
} from "@/lib/types";

const loggedCache = new Map<MediaType, UnifiedMediaItem[]>();
const DEBOUNCE_MS = 220;
const SEARCH_LIMIT = 12;

interface Top4PickerModalProps {
  type: MediaType;
  open: boolean;
  onClose: () => void;
}

export default function Top4PickerModal({
  type,
  open,
  onClose,
}: Top4PickerModalProps) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const { addToStash, isInStash } = useStash();
  const label = MEDIA_TYPE_LABELS[type];

  const [query, setQuery] = useState("");
  const [logged, setLogged] = useState<UnifiedMediaItem[]>([]);
  const [loggedLoading, setLoggedLoading] = useState(false);
  const [searchHits, setSearchHits] = useState<UnifiedMediaItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!open) return;

    setQuery("");
    setSearchHits([]);
    setSearchLoading(false);

    const cached = loggedCache.get(type);
    if (cached) {
      setLogged(cached);
      setLoggedLoading(false);
    } else {
      setLoggedLoading(true);
    }

    let cancelled = false;

    void getLoggedMediaForType(type).then((items) => {
      if (cancelled) return;
      loggedCache.set(type, items);
      setLogged(items);
      setLoggedLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, type]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 20);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchHits([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      void (async () => {
        const columns = await searchAllMedia(trimmed, {
          filterType: type,
          limit: SEARCH_LIMIT,
          signal: controller.signal,
        });
        if (requestId !== requestIdRef.current) return;
        setSearchHits(columns[type].results.slice(0, SEARCH_LIMIT));
        setSearchLoading(false);
      })();
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, type]);

  const trimmed = query.trim().toLowerCase();
  const loggedMatches = useMemo(() => {
    if (!trimmed) return logged;
    return logged.filter((item) => {
      const title = item.title.toLowerCase();
      const creator = item.creator.toLowerCase();
      return title.includes(trimmed) || creator.includes(trimmed);
    });
  }, [logged, trimmed]);

  const loggedIds = useMemo(
    () => new Set(loggedMatches.map((item) => item.id)),
    [loggedMatches]
  );

  const extraHits = useMemo(
    () =>
      searchHits.filter(
        (item) => item.mediaType === type && !loggedIds.has(item.id)
      ),
    [searchHits, loggedIds, type]
  );

  if (!open) return null;

  function pick(item: UnifiedMediaItem) {
    if (isInStash(item)) return;
    addToStash(item);
    onClose();
  }

  const searching = trimmed.length >= 2;
  const emptyLogged = !loggedLoading && loggedMatches.length === 0;
  const emptySearch = searching && !searchLoading && extraHits.length === 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close picker"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[82vh] w-full max-w-lg flex-col overflow-hidden border border-white/10 bg-zinc-950"
      >
        <div className="shrink-0 space-y-3 border-b border-white/[0.06] p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                Top 4
              </p>
              <h2
                id={titleId}
                className="mt-1 text-lg font-semibold text-white"
              >
                Add to {label}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-sm text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-200"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${label.toLowerCase()}…`}
            className="w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-white/[0.18]"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <PickerSection
            title="Your logs"
            loading={loggedLoading}
            empty={emptyLogged}
            emptyMessage={
              searching
                ? "No matching logs."
                : "Nothing logged in this category yet. Search above to add any title."
            }
          >
            {loggedMatches.map((item) => (
              <PickerPoster
                key={mediaKey(item)}
                item={item}
                inStash={isInStash(item)}
                onPick={pick}
              />
            ))}
          </PickerSection>

          {searching ? (
            <PickerSection
              title="Search"
              loading={searchLoading}
              empty={emptySearch}
              emptyMessage="No other titles found."
              className="mt-6"
            >
              {extraHits.map((item) => (
                <PickerPoster
                  key={mediaKey(item)}
                  item={item}
                  inStash={isInStash(item)}
                  onPick={pick}
                />
              ))}
            </PickerSection>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PickerSection({
  title,
  loading,
  empty,
  emptyMessage,
  className,
  children,
}: {
  title: string;
  loading: boolean;
  empty: boolean;
  emptyMessage: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={className}>
      <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
        {title}
      </h3>
      {loading ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] animate-pulse rounded-md bg-zinc-800/80"
            />
          ))}
        </div>
      ) : empty ? (
        <p className="text-sm text-zinc-500">{emptyMessage}</p>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">{children}</div>
      )}
    </section>
  );
}

function PickerPoster({
  item,
  inStash,
  onPick,
}: {
  item: UnifiedMediaItem;
  inStash: boolean;
  onPick: (item: UnifiedMediaItem) => void;
}) {
  return (
    <button
      type="button"
      disabled={inStash}
      onClick={() => onPick(item)}
      title={inStash ? `${item.title} is already in your Top 4` : item.title}
      className={cn(
        "group text-left outline-none",
        inStash && "cursor-default opacity-40"
      )}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-zinc-800 ring-1 ring-white/10 transition group-hover:ring-white/25 group-focus-visible:ring-emerald-400/70">
        {item.thumbnail ? (
          <Image
            src={item.thumbnail}
            alt=""
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <span className="flex h-full items-center justify-center px-1 text-center text-[10px] leading-tight text-zinc-500">
            {item.title}
          </span>
        )}
        {inStash ? (
          <span className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-1 text-center text-[9px] font-medium uppercase tracking-wide text-zinc-200">
            In Top 4
          </span>
        ) : null}
      </div>
      <p className="mt-1 line-clamp-2 text-[11px] leading-tight text-zinc-400">
        {item.title}
      </p>
    </button>
  );
}
