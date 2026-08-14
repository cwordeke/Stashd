"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import DisplayStars from "@/components/DisplayStars";
import {
  addListItem,
  createList,
  deleteList,
  removeListItem,
  reorderListItems,
  updateList,
  updateListItemNotes,
} from "@/app/actions/lists";
import { flattenRanked, searchAllMedia } from "@/lib/search-client";
import type { ListItem, MediaList } from "@/lib/profile-tabs";
import {
  MEDIA_TYPE_LABELS,
  mediaDetailPath,
  mediaKey,
  type UnifiedMediaItem,
} from "@/lib/types";
import { cn } from "@/lib/cn";

const DEBOUNCE_MS = 280;
const SUGGESTION_LIMIT = 8;

interface ListEditClientProps {
  username: string;
  list: MediaList | null;
  mode: "create" | "edit";
}

export default function ListEditClient({
  username,
  list,
  mode,
}: ListEditClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [listId, setListId] = useState(list?.id ?? null);
  const [name, setName] = useState(list?.name ?? "");
  const [description, setDescription] = useState(list?.description ?? "");
  const [tags, setTags] = useState<string[]>(list?.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  const [isRanked, setIsRanked] = useState(list?.isRanked ?? false);
  const [isPublic, setIsPublic] = useState(list?.isPublic ?? true);
  const [items, setItems] = useState<ListItem[]>(list?.items ?? []);
  const [view, setView] = useState<"list" | "grid">("list");
  const [dirty, setDirty] = useState(mode === "create");
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    if (!list) return;
    setListId(list.id);
    setItems(list.items);
    if (!dirty) {
      setName(list.name);
      setDescription(list.description);
      setTags(list.tags);
      setIsRanked(list.isRanked);
      setIsPublic(list.isPublic);
    }
  }, [list, dirty]);

  const profileListsHref = `/u/${username}?tab=lists`;
  const viewHref = listId ? `/u/${username}/lists/${listId}` : profileListsHref;

  function markDirty() {
    setDirty(true);
  }

  function commitTag(raw: string) {
    const tag = raw.trim().toLowerCase().slice(0, 40);
    if (!tag) return;
    setTags((prev) => {
      if (prev.includes(tag) || prev.length >= 20) return prev;
      return [...prev, tag];
    });
    setTagDraft("");
    markDirty();
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "Tab" || e.key === ",") {
      if (tagDraft.trim()) {
        e.preventDefault();
        commitTag(tagDraft);
      }
    } else if (e.key === "Backspace" && !tagDraft && tags.length) {
      setTags((prev) => prev.slice(0, -1));
      markDirty();
    }
  }

  function persistMeta(nextListId?: string) {
    const id = nextListId ?? listId;
    if (!id) return;

    startTransition(async () => {
      const result = await updateList({
        listId: id,
        name,
        description,
        tags,
        isRanked,
        isPublic,
      });
      if (!result.ok) {
        return;
      }
      setDirty(false);
      router.refresh();
    });
  }

  function handleSave(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    startTransition(async () => {
      if (mode === "create" && !listId) {
        const result = await createList({
          name: trimmed,
          description,
          tags,
          isRanked,
          isPublic,
        });
        if (!result.ok || !result.listId) {
          return;
        }
        setListId(result.listId);
        setDirty(false);
        router.replace(`/u/${username}/lists/${result.listId}/edit`);
        router.refresh();
        return;
      }

      persistMeta();
    });
  }

  function handleDelete() {
    if (!listId) return;
    if (!window.confirm(`Delete “${name || "this list"}”? This cannot be undone.`)) {
      return;
    }
    startTransition(async () => {
      const result = await deleteList(listId);
      if (result.ok) {
        router.push(profileListsHref);
        router.refresh();
      }
    });
  }

  async function ensureListExists(): Promise<string | null> {
    if (listId) return listId;
    const trimmed = name.trim();
    if (!trimmed) {
      return null;
    }
    const result = await createList({
      name: trimmed,
      description,
      tags,
      isRanked,
      isPublic,
    });
    if (!result.ok || !result.listId) {
      return null;
    }
    setListId(result.listId);
    setDirty(false);
    router.replace(`/u/${username}/lists/${result.listId}/edit`);
    return result.listId;
  }

  function handleAddMedia(media: UnifiedMediaItem) {
    startTransition(async () => {
      const id = await ensureListExists();
      if (!id) return;

      const result = await addListItem(id, media);
      if (!result.ok) {
        return;
      }

      setItems((prev) => {
        if (
          prev.some(
            (item) =>
              item.mediaType === media.mediaType && item.mediaId === media.id
          )
        ) {
          return prev;
        }
        return [
          ...prev,
          {
            id: result.itemId ?? `temp-${mediaKey(media)}`,
            mediaId: media.id,
            mediaType: media.mediaType,
            title: media.title,
            creator: media.creator,
            year: media.year,
            thumbnail: media.thumbnail,
            notes: "",
            position: prev.length,
            rating: null,
          },
        ];
      });
      router.refresh();
    });
  }

  function handleRemoveItem(itemId: string) {
    if (!listId) return;
    startTransition(async () => {
      const result = await removeListItem(listId, itemId);
      if (!result.ok) {
        return;
      }
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      router.refresh();
    });
  }

  function handleSaveNotes(itemId: string, notes: string) {
    if (!listId || itemId.startsWith("temp-")) return;
    startTransition(async () => {
      const result = await updateListItemNotes(listId, itemId, notes);
      if (!result.ok) {
        return;
      }
      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, notes } : item))
      );
    });
  }

  function applyOrder(next: ListItem[]) {
    setItems(next);
    if (!listId) return;
    const ids = next
      .map((item) => item.id)
      .filter((id) => !id.startsWith("temp-"));
    if (!ids.length) return;

    startTransition(async () => {
      const result = await reorderListItems(listId, ids);
      if (result.ok) router.refresh();
    });
  }

  function moveItem(fromId: string, toId: string) {
    if (fromId === toId) return;
    const next = [...items];
    const fromIndex = next.findIndex((i) => i.id === fromId);
    const toIndex = next.findIndex((i) => i.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    applyOrder(next);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={profileListsHref}
            className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500 transition hover:text-zinc-300"
          >
            ← Your lists
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50">
            {mode === "create" && !listId ? "New list" : "Edit list"}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {listId ? (
            <>
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                className="rounded-md border border-white/10 bg-transparent px-3 py-2 text-[13px] font-medium text-zinc-300 transition-colors hover:border-red-500/40 hover:text-red-300 disabled:opacity-50"
              >
                Delete
              </button>
              <Link
                href={viewHref}
                className="rounded-md border border-white/10 px-3 py-2 text-[13px] font-medium text-zinc-200 transition-colors hover:bg-white/[0.05]"
              >
                View list
              </Link>
            </>
          ) : null}
          <button
            type="submit"
            form="list-meta-form"
            disabled={pending || (!dirty && mode === "edit")}
            className="rounded-md bg-emerald-600 px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <form
        id="list-meta-form"
        onSubmit={handleSave}
        className="grid gap-5 border border-white/10 bg-zinc-900/30 p-4 sm:grid-cols-2 sm:p-5"
      >
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Name <span className="text-emerald-400">•</span>
            </span>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                markDirty();
              }}
              required
              maxLength={120}
              className="w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-white/[0.18]"
              placeholder="e.g. Favorites of 2026"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Tags
            </span>
            <p className="text-[11px] text-zinc-600">
              Press Tab or Enter to create
            </p>
            <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5 py-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setTags((prev) => prev.filter((t) => t !== tag));
                    markDirty();
                  }}
                  className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300 transition hover:bg-zinc-700"
                >
                  #{tag} ×
                </button>
              ))}
              <input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => commitTag(tagDraft)}
                placeholder={tags.length ? "" : "eg. top 10"}
                className="min-w-[8rem] flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
              />
            </div>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Who can view?
            </span>
            <select
              value={isPublic ? "public" : "private"}
              onChange={(e) => {
                setIsPublic(e.target.value === "public");
                markDirty();
              }}
              className="w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-white/[0.18]"
            >
              <option value="public">Anyone — Public list</option>
              <option value="private">Only you — Private list</option>
            </select>
          </label>

          <label className="flex items-start gap-3 border border-white/10 bg-white/[0.03] px-3 py-3">
            <input
              type="checkbox"
              checked={isRanked}
              onChange={(e) => {
                setIsRanked(e.target.checked);
                markDirty();
              }}
              className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
            />
            <span>
              <span className="block text-sm font-medium text-zinc-200">
                Ranked list
              </span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                Show position for each title.
              </span>
            </span>
          </label>
        </div>

        <label className="block space-y-1.5 sm:min-h-full">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Description
          </span>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              markDirty();
            }}
            rows={10}
            maxLength={4000}
            className="h-[calc(100%-1.5rem)] min-h-[10rem] w-full resize-y rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm leading-relaxed text-zinc-100 outline-none focus:border-white/[0.18]"
            placeholder="What’s this list about?"
          />
        </label>
      </form>

      <div className="mt-8 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <AddMediaSearch onSelect={handleAddMedia} disabled={pending} />
          <div className="ml-auto flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 p-1">
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-medium transition",
                view === "list"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setView("grid")}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-medium transition",
                view === "grid"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Grid
            </button>
          </div>
        </div>

        {!items.length ? (
          <div className="border border-dashed border-white/10 px-6 py-14 text-center text-sm text-zinc-500">
            Search above to add movies, shows, games, books, or albums.
          </div>
        ) : view === "grid" ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {items.map((item, index) => (
              <li
                key={item.id}
                className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/70"
              >
                <Link
                  href={mediaDetailPath(item.mediaType, item.mediaId)}
                  className="block"
                >
                  <div className="relative aspect-[2/3] bg-zinc-800">
                    {item.thumbnail ? (
                      <Image
                        src={item.thumbnail}
                        alt={item.title}
                        fill
                        sizes="160px"
                        className="object-cover"
                      />
                    ) : null}
                    {isRanked ? (
                      <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-xs font-semibold text-white">
                        {index + 1}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate px-2 py-2 text-xs font-medium text-zinc-200">
                    {item.title}
                  </p>
                </Link>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(item.id)}
                  disabled={pending || item.id.startsWith("temp-")}
                  className="absolute right-1.5 top-1.5 rounded bg-black/70 p-1 text-zinc-300 opacity-0 transition hover:text-red-300 group-hover:opacity-100 disabled:opacity-40"
                  aria-label="Remove"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="divide-y divide-white/[0.06] overflow-hidden border border-white/10">
            {items.map((item, index) => (
              <EditListRow
                key={item.id}
                item={item}
                index={index}
                isRanked={isRanked}
                pending={pending}
                dragging={dragId === item.id}
                onDragStart={() => setDragId(item.id)}
                onDragEnd={() => setDragId(null)}
                onDropOn={(targetId) => {
                  if (dragId) moveItem(dragId, targetId);
                  setDragId(null);
                }}
                onRemove={() => handleRemoveItem(item.id)}
                onSaveNotes={(notes) => handleSaveNotes(item.id, notes)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AddMediaSearch({
  onSelect,
  disabled,
}: {
  onSelect: (item: UnifiedMediaItem) => void;
  disabled?: boolean;
}) {
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

  function pick(item: UnifiedMediaItem) {
    onSelect(item);
    setQuery("");
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!open || !suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      pick(suggestions[activeIndex]);
    }
  }

  return (
    <div ref={rootRef} className="relative flex min-w-0 flex-1 flex-wrap gap-2">
      <span className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white">
        Add a title
      </span>
      <div className="relative min-w-[12rem] flex-1">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length && setOpen(true)}
          disabled={disabled}
          placeholder="Enter name of film, show, game…"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          className="w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-white/[0.18] disabled:opacity-50"
        />
        {open && (suggestions.length > 0 || loading) ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-72 w-full overflow-auto border border-white/10 bg-zinc-950 py-1"
          >
            {loading && !suggestions.length ? (
              <li className="px-3 py-2 text-xs text-zinc-500">Searching…</li>
            ) : null}
            {suggestions.map((item, index) => (
              <li key={mediaKey(item)} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  onClick={() => pick(item)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition",
                    index === activeIndex
                      ? "bg-zinc-800 text-zinc-50"
                      : "text-zinc-300 hover:bg-zinc-900"
                  )}
                >
                  <span className="relative h-10 w-7 shrink-0 overflow-hidden rounded bg-zinc-800">
                    {item.thumbnail ? (
                      <Image
                        src={item.thumbnail}
                        alt=""
                        fill
                        sizes="28px"
                        className="object-cover"
                      />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{item.title}</span>
                    <span className="block truncate text-xs text-zinc-500">
                      {MEDIA_TYPE_LABELS[item.mediaType]}
                      {item.year && item.year !== "—" ? ` · ${item.year}` : ""}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function EditListRow({
  item,
  index,
  isRanked,
  pending,
  dragging,
  onDragStart,
  onDragEnd,
  onDropOn,
  onRemove,
  onSaveNotes,
}: {
  item: ListItem;
  index: number;
  isRanked: boolean;
  pending: boolean;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDropOn: (id: string) => void;
  onRemove: () => void;
  onSaveNotes: (notes: string) => void;
}) {
  const [notesOpen, setNotesOpen] = useState(Boolean(item.notes));
  const [notes, setNotes] = useState(item.notes);

  useEffect(() => {
    setNotes(item.notes);
  }, [item.notes]);

  return (
    <li
      draggable={!item.id.startsWith("temp-")}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDropOn(item.id);
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "flex items-start gap-3 px-3 py-3.5 sm:gap-4 sm:px-4",
        dragging && "opacity-40"
      )}
    >
      {isRanked ? (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 text-lg font-semibold text-zinc-100">
          {index + 1}
        </div>
      ) : null}

      <Link
        href={mediaDetailPath(item.mediaType, item.mediaId)}
        className="relative h-16 w-11 shrink-0 overflow-hidden rounded bg-zinc-800"
      >
        {item.thumbnail ? (
          <Image
            src={item.thumbnail}
            alt=""
            fill
            sizes="44px"
            className="object-cover"
          />
        ) : null}
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          href={mediaDetailPath(item.mediaType, item.mediaId)}
          className="font-medium text-zinc-100 transition hover:text-emerald-300"
        >
          {item.title}
          {item.year && item.year !== "—" ? (
            <span className="ml-1.5 text-sm font-normal text-zinc-500">
              {item.year}
            </span>
          ) : null}
        </Link>
        <p className="mt-0.5 text-xs text-zinc-500">
          {MEDIA_TYPE_LABELS[item.mediaType]}
          {item.creator && item.creator !== "—" ? ` · ${item.creator}` : ""}
        </p>
        {item.rating != null ? (
          <div className="mt-1.5">
            <DisplayStars rating={item.rating} size="sm" />
          </div>
        ) : null}

        {notesOpen ? (
          <div className="mt-2 space-y-2">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="Add a note…"
              className="w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5 py-2 text-sm text-zinc-200 outline-none focus:border-white/[0.18]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => onSaveNotes(notes)}
                className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                Save note
              </button>
              <button
                type="button"
                onClick={() => {
                  setNotesOpen(false);
                  setNotes(item.notes);
                }}
                className="rounded-md px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setNotesOpen(true)}
            className="mt-2 text-xs font-medium uppercase tracking-wide text-zinc-500 transition hover:text-emerald-400"
          >
            {item.notes ? "Edit note" : "Add note"}
          </button>
        )}
        {item.notes && !notesOpen ? (
          <p className="mt-1 text-sm text-zinc-400">{item.notes}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onRemove}
          disabled={pending || item.id.startsWith("temp-")}
          className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-800 hover:text-red-300 disabled:opacity-40"
          aria-label="Remove from list"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
        <span
          className="cursor-grab rounded-lg p-2 text-zinc-600 active:cursor-grabbing"
          title="Drag to reorder"
          aria-hidden
        >
          <GripIcon className="h-4 w-4" />
        </span>
      </div>
    </li>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function GripIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="9" cy="7" r="1.5" />
      <circle cx="15" cy="7" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="17" r="1.5" />
      <circle cx="15" cy="17" r="1.5" />
    </svg>
  );
}
