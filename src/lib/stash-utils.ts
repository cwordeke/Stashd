import {
  emptyShelves,
  type MediaType,
  type StashShelves,
  type UnifiedMediaItem,
} from "@/lib/types";

export const STASH_TOP_N = 4;

export type StashItemLike = UnifiedMediaItem & { stashId: string };

export function shelvesFromItems(items: StashItemLike[]): StashShelves {
  const shelves = emptyShelves();

  for (const item of items) {
    const shelf = shelves[item.mediaType];
    if (shelf.filter(Boolean).length >= STASH_TOP_N) continue;
    const emptyIndex = shelf.findIndex((slot) => slot === null);
    if (emptyIndex !== -1) {
      shelf[emptyIndex] = item;
    }
  }

  return shelves;
}

export function countByMediaType(
  items: Array<Pick<UnifiedMediaItem, "mediaType">>,
  mediaType: MediaType
): number {
  return items.filter((item) => item.mediaType === mediaType).length;
}
