import { createClient } from "@/utils/supabase/server";
import { getSimilarGames, getNewGames } from "@/lib/providers/igdb";
import { getNewBooks, searchBooks } from "@/lib/providers/openlibrary";
import { getNewMusic, searchMusic } from "@/lib/providers/spotify";
import {
  getPopularNewMovies,
  getPopularNewTv,
  getTmdbRecommendations,
} from "@/lib/providers/tmdb";
import { getPlaceholderResults } from "@/lib/popular";
import { getTrendingForType } from "@/lib/trending";
import {
  MEDIA_TYPES,
  isMediaType,
  mediaKey,
  type MediaType,
  type UnifiedMediaItem,
} from "@/lib/types";

const SHELF_SIZE = 16;
const MAX_SEEDS = 12;

interface TasteSeed {
  id: string;
  mediaType: MediaType;
  title: string;
  creator: string;
  score: number;
}

function interleave(
  groups: UnifiedMediaItem[][],
  limit: number,
  exclude: Set<string> = new Set()
): UnifiedMediaItem[] {
  const seen = new Set(exclude);
  const out: UnifiedMediaItem[] = [];
  let index = 0;

  while (out.length < limit) {
    let added = false;
    for (const group of groups) {
      const item = group[index];
      if (!item) continue;
      const key = mediaKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
      added = true;
      if (out.length >= limit) break;
    }
    if (!added) break;
    index += 1;
  }

  return out;
}

export async function getPopularThisWeek(): Promise<UnifiedMediaItem[]> {
  const columns = await Promise.all(
    MEDIA_TYPES.map(async (type) => {
      const { results } = await getTrendingForType(type);
      return results;
    })
  );
  return interleave(columns, SHELF_SIZE);
}

export async function getNewReleases(): Promise<UnifiedMediaItem[]> {
  const settled = await Promise.allSettled([
    getPopularNewMovies(),
    getPopularNewTv(),
    getNewGames(),
    getNewBooks(),
    getNewMusic(),
  ]);

  const groups = settled.map((result, index) => {
    if (result.status === "fulfilled" && result.value.length > 0) {
      return result.value;
    }
    return getPlaceholderResults(MEDIA_TYPES[index]!);
  });

  return interleave(groups, SHELF_SIZE);
}

function keyOf(mediaType: string, mediaId: string) {
  return `${mediaType}:${mediaId}`;
}

function creatorQuery(creator: string, title: string): string | null {
  const cleaned = creator
    .replace(/^directed by\s+/i, "")
    .replace(/^by\s+/i, "")
    .split(",")[0]
    ?.trim();
  if (cleaned && cleaned !== "—") return cleaned;
  if (title && title !== "Untitled") return title;
  return null;
}

function pickSeeds(seeds: TasteSeed[]): TasteSeed[] {
  const byType = new Map<MediaType, TasteSeed[]>();
  for (const seed of seeds) {
    const list = byType.get(seed.mediaType) ?? [];
    list.push(seed);
    byType.set(seed.mediaType, list);
  }
  for (const list of byType.values()) {
    list.sort((a, b) => b.score - a.score);
  }

  const picked: TasteSeed[] = [];
  const seen = new Set<string>();
  let round = 0;
  while (picked.length < MAX_SEEDS) {
    let added = false;
    for (const type of MEDIA_TYPES) {
      const seed = byType.get(type)?.[round];
      if (!seed) continue;
      const key = keyOf(seed.mediaType, seed.id);
      if (seen.has(key)) continue;
      seen.add(key);
      picked.push(seed);
      added = true;
      if (picked.length >= MAX_SEEDS) break;
    }
    if (!added) break;
    round += 1;
  }
  return picked;
}

async function recommendationsFor(seed: TasteSeed): Promise<UnifiedMediaItem[]> {
  try {
    switch (seed.mediaType) {
      case "movie":
      case "tv":
        return await getTmdbRecommendations(seed.mediaType, seed.id);
      case "game":
        return await getSimilarGames(seed.id);
      case "book": {
        const query = creatorQuery(seed.creator, seed.title);
        return query ? await searchBooks(query) : [];
      }
      case "music": {
        const query = creatorQuery(seed.creator, seed.title);
        return query ? await searchMusic(query) : [];
      }
    }
  } catch {
    return [];
  }
}

function upsertSeed(
  byKey: Map<string, TasteSeed>,
  seen: Set<string>,
  row: {
    media_id?: unknown;
    media_type?: unknown;
    title?: unknown;
    creator?: unknown;
  },
  score: number
) {
  const mediaType = row.media_type;
  const mediaId = row.media_id;
  if (typeof mediaType !== "string" || !isMediaType(mediaType)) return;
  if (typeof mediaId !== "string" || !mediaId) return;

  const key = keyOf(mediaType, mediaId);
  seen.add(key);

  const title = typeof row.title === "string" ? row.title : "";
  const creator = typeof row.creator === "string" ? row.creator : "";
  const existing = byKey.get(key);
  if (existing) {
    existing.score = Math.max(existing.score, score);
    if (!existing.title && title) existing.title = title;
    if (!existing.creator && creator) existing.creator = creator;
    return;
  }

  byKey.set(key, {
    id: mediaId,
    mediaType,
    title,
    creator,
    score,
  });
}

async function loadTaste(userId: string): Promise<{
  seeds: TasteSeed[];
  seen: Set<string>;
}> {
  const supabase = await createClient();

  const [ratingsRes, logsRes, diaryRes, stashRes, listRes] = await Promise.all([
    supabase
      .from("user_ratings")
      .select("media_id, media_type, rating, title, creator")
      .eq("user_id", userId),
    supabase
      .from("user_media_logs")
      .select("media_id, media_type, title, creator, is_liked, on_list, status")
      .eq("user_id", userId),
    supabase
      .from("diary_entries")
      .select("media_id, media_type, title, creator, rating, is_liked")
      .eq("user_id", userId),
    supabase
      .from("stash_items")
      .select("media_id, media_type, title, creator")
      .eq("user_id", userId),
    supabase
      .from("list_items")
      .select("media_id, media_type, title, creator")
      .eq("user_id", userId),
  ]);

  const seen = new Set<string>();
  const byKey = new Map<string, TasteSeed>();

  for (const row of ratingsRes.data ?? []) {
    const rating = Number(row.rating);
    upsertSeed(
      byKey,
      seen,
      row,
      Number.isFinite(rating) ? rating : 2
    );
  }

  for (const row of logsRes.data ?? []) {
    let score = 1;
    if (row.is_liked) score = 5;
    else if (row.status && row.status !== "list") score = 2.5;
    else if (row.on_list) score = 1.5;
    upsertSeed(byKey, seen, row, score);
  }

  for (const row of diaryRes.data ?? []) {
    const rating = Number(row.rating);
    let score = 3;
    if (row.is_liked) score = 5;
    else if (Number.isFinite(rating)) score = Math.max(rating, 2);
    upsertSeed(byKey, seen, row, score);
  }

  for (const row of stashRes.data ?? []) {
    upsertSeed(byKey, seen, row, 4.5);
  }

  for (const row of listRes.data ?? []) {
    upsertSeed(byKey, seen, row, 2);
  }

  return { seeds: pickSeeds([...byKey.values()]), seen };
}

/** Personal picks from the full profile history; falls back to popular new releases. */
export async function getDiscoverSuggestions(): Promise<UnifiedMediaItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return getNewReleases();
  }

  const { seeds, seen } = await loadTaste(user.id);
  if (seeds.length === 0) {
    return interleave([await getNewReleases()], SHELF_SIZE, seen);
  }

  const groups = await Promise.all(seeds.map((seed) => recommendationsFor(seed)));
  const picks = interleave(groups, SHELF_SIZE, seen);
  if (picks.length > 0) return picks;

  const fallback = await getNewReleases();
  return interleave([picks, fallback], SHELF_SIZE, seen);
}
