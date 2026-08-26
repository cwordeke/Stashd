import {
  emptyShelves,
  type MediaType,
  type StashShelves,
  type UnifiedMediaItem,
} from "@/lib/types";

export const STASH_TOP_N = 4;

export type StashItemLike = UnifiedMediaItem & {
  stashId: string;
  position?: number;
};

export function shelvesFromItems(items: StashItemLike[]): StashShelves {
  const shelves = emptyShelves();
  const byType = new Map<MediaType, StashItemLike[]>();

  for (const item of items) {
    const list = byType.get(item.mediaType) ?? [];
    list.push(item);
    byType.set(item.mediaType, list);
  }

  for (const [type, list] of byType) {
    list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    list.slice(0, STASH_TOP_N).forEach((item, index) => {
      shelves[type][index] = item;
    });
  }

  return shelves;
}

export function moveIndex<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length
  ) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function reorderItemsByType<T extends StashItemLike>(
  items: T[],
  mediaType: MediaType,
  orderedStashIds: string[]
): T[] {
  const byId = new Map(
    items
      .filter((item) => item.mediaType === mediaType)
      .map((item) => [item.stashId, item])
  );

  const reordered: T[] = [];
  orderedStashIds.forEach((id, index) => {
    const item = byId.get(id);
    if (!item) return;
    reordered.push({ ...item, position: index });
  });

  const remaining = items.filter(
    (item) => item.mediaType !== mediaType || !byId.has(item.stashId)
  );

  return [...remaining, ...reordered];
}

export function slotIndexFromX(
  clientX: number,
  container: DOMRect,
  itemCount: number,
  slotCount = STASH_TOP_N
): number {
  if (itemCount <= 1) return 0;
  const ratio = container.width <= 0 ? 0 : (clientX - container.left) / container.width;
  const column = Math.floor(ratio * slotCount);
  const clampedColumn = Math.max(0, Math.min(slotCount - 1, column));
  return Math.max(0, Math.min(itemCount - 1, clampedColumn));
}

export function countByMediaType(
  items: Array<Pick<UnifiedMediaItem, "mediaType">>,
  mediaType: MediaType
): number {
  return items.filter((item) => item.mediaType === mediaType).length;
}
