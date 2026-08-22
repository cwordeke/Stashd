import { getTwitchAccessToken, getTwitchClientId } from "@/lib/twitch";
import { igdbCover, yearFromUnix } from "@/lib/media";
import { recentReleaseWindow, startOfDay, unixSeconds } from "@/lib/release-window";
import type { UnifiedMediaItem } from "@/lib/types";

interface IgdbGame {
  id: number;
  name?: string;
  first_release_date?: number;
  cover?: { url?: string };
  similar_games?: number[];
  involved_companies?: Array<{
    developer?: boolean;
    publisher?: boolean;
    company?: { name?: string };
  }>;
}

function pickStudio(game: IgdbGame): string {
  const companies = game.involved_companies ?? [];
  const developer = companies.find((c) => c.developer)?.company?.name;
  if (developer) return developer;
  const publisher = companies.find((c) => c.publisher)?.company?.name;
  if (publisher) return publisher;
  return companies[0]?.company?.name ?? "—";
}

function mapGames(data: IgdbGame[]): UnifiedMediaItem[] {
  return (data ?? []).map((game) => ({
    id: String(game.id),
    title: game.name ?? "Untitled",
    creator: pickStudio(game),
    year: yearFromUnix(game.first_release_date),
    thumbnail: igdbCover(game.cover?.url),
    mediaType: "game" as const,
  }));
}

async function igdbQuery(
  body: string,
  revalidate = 3600
): Promise<IgdbGame[]> {
  const token = await getTwitchAccessToken();
  const clientId = getTwitchClientId();

  const res = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "text/plain",
    },
    body,
    next: { revalidate },
  });

  if (!res.ok) throw new Error(`IGDB request failed: ${res.status}`);
  return (await res.json()) as IgdbGame[];
}

const FIELDS =
  "fields name,first_release_date,cover.url,involved_companies.developer,involved_companies.publisher,involved_companies.company.name;";

export async function searchGames(query: string): Promise<UnifiedMediaItem[]> {
  const body = [
    `search "${query.replace(/"/g, '\\"')}";`,
    FIELDS,
    "limit 10;",
  ].join(" ");

  return mapGames(await igdbQuery(body, 120));
}

export async function getTrendingGames(
  limit = 20
): Promise<UnifiedMediaItem[]> {
  const body = [
    "where rating_count > 50 & version_parent = null & cover != null;",
    "sort rating_count desc;",
    FIELDS,
    `limit ${Math.max(1, Math.min(limit, 100))};`,
  ].join(" ");

  return mapGames(await igdbQuery(body, 86400));
}

export async function getPopularGames(): Promise<UnifiedMediaItem[]> {
  return getTrendingGames();
}

export async function getNewGames(): Promise<UnifiedMediaItem[]> {
  const { from, to } = recentReleaseWindow(3);
  const since = unixSeconds(startOfDay(from));
  const now = unixSeconds(startOfDay(to)) + 24 * 60 * 60 - 1;
  const body = [
    `where first_release_date >= ${since} & first_release_date <= ${now} & version_parent = null & cover != null;`,
    "sort rating_count desc;",
    FIELDS,
    "limit 20;",
  ].join(" ");

  return mapGames(await igdbQuery(body, 86400));
}

export async function getSimilarGames(id: string): Promise<UnifiedMediaItem[]> {
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) return [];

  const rows = await igdbQuery(
    `fields similar_games; where id = ${numericId}; limit 1;`,
    86400
  );
  const similarIds = (rows[0]?.similar_games ?? [])
    .filter((value) => Number.isFinite(value))
    .slice(0, 12);
  if (similarIds.length === 0) return [];

  const body = [
    `where id = (${similarIds.join(",")}) & cover != null & version_parent = null;`,
    FIELDS,
    "limit 10;",
  ].join(" ");

  return mapGames(await igdbQuery(body, 86400));
}
