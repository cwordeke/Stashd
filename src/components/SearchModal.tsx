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
import { searchUsers, type SocialUser } from "@/app/actions/social";
import { useNavigationPending } from "@/context/NavigationPendingContext";
import { flattenRanked, searchAllMedia } from "@/lib/search-client";
import {
  MEDIA_TYPE_LABELS,
  mediaDetailPath,
  mediaKey,
  type UnifiedMediaItem,
} from "@/lib/types";
import { cn } from "@/lib/cn";

const DEBOUNCE_MS = 200;
const SUGGESTION_LIMIT = 8;

type SearchTab = "media" | "users";

export default function SearchModal() {
  const router = useRouter();
  const { beginNavigation } = useNavigationPending();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<SearchTab>("media");
  const [suggestions, setSuggestions] = useState<UnifiedMediaItem[]>([]);
  const [users, setUsers] = useState<SocialUser[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const requestIdRef = useRef(0);

  function close() {
    setOpen(false);
    setActiveIndex(-1);
  }

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions([]);
      setUsers([]);
      setLoading(false);
      setActiveIndex(-1);
      return;
    }

    setLoading(true);
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      void (async () => {
        if (tab === "users") {
          const results = await searchUsers(trimmed);
          if (requestId !== requestIdRef.current) return;
          setUsers(results);
          setSuggestions([]);
          setLoading(false);
          setActiveIndex(-1);
          setOpen(true);
          return;
        }

        const columns = await searchAllMedia(trimmed, {
          limit: SUGGESTION_LIMIT,
          signal: controller.signal,
        });
        if (requestId !== requestIdRef.current) return;
        setSuggestions(flattenRanked(trimmed, columns, SUGGESTION_LIMIT));
        setUsers([]);
        setLoading(false);
        setActiveIndex(-1);
        setOpen(true);
      })();
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, tab]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function goToSearch(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    close();
    const href = `/search?q=${encodeURIComponent(trimmed)}`;
    beginNavigation(href);
    router.push(href);
  }

  function goToItem(item: UnifiedMediaItem) {
    const href = mediaDetailPath(item.mediaType, item.id);
    close();
    setQuery("");
    setSuggestions([]);
    setUsers([]);
    beginNavigation(href);
    router.push(href);
  }

  function goToUser(user: SocialUser) {
    const href = `/u/${user.username}`;
    close();
    setQuery("");
    setSuggestions([]);
    setUsers([]);
    beginNavigation(href);
    router.push(href);
  }

  function selectTab(next: SearchTab) {
    if (next === tab) return;
    setTab(next);
    setActiveIndex(-1);
    setOpen(true);
    inputRef.current?.focus();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (tab === "users") {
      const pick =
        activeIndex >= 0 && users[activeIndex]
          ? users[activeIndex]
          : users[0];
      if (pick) goToUser(pick);
      return;
    }
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      goToItem(suggestions[activeIndex]);
      return;
    }
    goToSearch(query);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }

    const count = tab === "users" ? users.length : suggestions.length;
    if (!open || count === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % count);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? count - 1 : i - 1));
    }
  }

  const trimmedQuery = query.trim();
  const resultCount = tab === "users" ? users.length : suggestions.length;
  const showPanel = open;
  const showEmpty =
    showPanel && !loading && trimmedQuery.length > 0 && resultCount === 0;

  return (
    <div ref={rootRef} className="relative w-full max-w-[12.5rem] shrink-0 sm:max-w-[200px]">
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative">
          <SearchGlyph className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={
              tab === "users" ? "Search users…" : "Search movies, shows..."
            }
            aria-label={tab === "users" ? "Search users" : "Search media"}
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={showPanel}
            aria-activedescendant={
              activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
            }
            role="combobox"
            autoComplete="off"
            className={cn(
              "h-9 w-full rounded-md border border-white/[0.08] bg-white/[0.04] py-0 pl-8 pr-3",
              "text-[13px] text-zinc-100 outline-none placeholder:text-zinc-500",
              "transition-colors",
              "hover:border-white/[0.12]",
              "focus:border-white/[0.18] focus:bg-white/[0.06]"
            )}
          />
        </div>
      </form>

      {showPanel ? (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-md border border-white/10 bg-zinc-950 shadow-lg shadow-black/40">
          <div
            className="flex gap-1 border-b border-zinc-800 p-1.5"
            role="tablist"
            aria-label="Search type"
          >
            <SearchTabButton
              active={tab === "media"}
              onClick={() => selectTab("media")}
            >
              Media
            </SearchTabButton>
            <SearchTabButton
              active={tab === "users"}
              onClick={() => selectTab("users")}
            >
              Users
            </SearchTabButton>
          </div>

          <ul
            id={listId}
            role="listbox"
            className="max-h-[min(360px,70vh)] overflow-y-auto py-1"
          >
            {loading && resultCount === 0 && trimmedQuery ? (
              <li className="px-3 py-2 text-sm text-zinc-500">Searching…</li>
            ) : null}

            {!trimmedQuery ? (
              <li className="px-3 py-2 text-sm text-zinc-500">
                {tab === "users"
                  ? "Type a username to find people"
                  : "Search movies, TV, games, books, music…"}
              </li>
            ) : null}

            {tab === "media"
              ? suggestions.map((item, index) => {
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
                })
              : users.map((user, index) => {
                  const active = index === activeIndex;
                  return (
                    <li
                      key={user.id}
                      id={`${listId}-option-${index}`}
                      role="option"
                      aria-selected={active}
                    >
                      <button
                        type="button"
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => goToUser(user)}
                        className={cn(
                          "flex w-full items-center gap-3 px-3 py-2 text-left transition",
                          active ? "bg-zinc-800" : "hover:bg-zinc-900"
                        )}
                      >
                        <UserAvatar
                          username={user.username}
                          avatarUrl={user.avatar_url}
                        />
                        <span className="min-w-0 truncate text-sm text-zinc-100">
                          @{user.username}
                        </span>
                      </button>
                    </li>
                  );
                })}

            {showEmpty ? (
              <li className="px-3 py-2 text-sm text-zinc-500">
                {tab === "users" ? "No users found" : "No matches"}
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function SearchGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle
        cx="11"
        cy="11"
        r="6.25"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M16.2 16.2 20 20"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium tracking-[0.08em] uppercase transition-colors",
        active
          ? "bg-white/[0.08] text-white"
          : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
      )}
    >
      {children}
    </button>
  );
}

function UserAvatar({
  username,
  avatarUrl,
}: {
  username: string;
  avatarUrl: string | null;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote avatars vary by host
      <img
        src={avatarUrl}
        alt={username}
        width={28}
        height={28}
        className="h-7 w-7 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-400"
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5z" />
      </svg>
    </span>
  );
}
