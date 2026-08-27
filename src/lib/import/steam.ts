import { completedStatusFor } from "@/lib/media-status";
import { searchGames } from "@/lib/providers/igdb";
import type { UnifiedMediaItem } from "@/lib/types";
import type { createClient } from "@/utils/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

interface ExistingLog {
  id: string;
  on_list: boolean | null;
  is_liked: boolean | null;
}

interface SteamOwnedGame {
  appid: number;
  name?: string;
  playtime_forever?: number;
}

interface SteamOwnedGamesResponse {
  response?: {
    game_count?: number;
    games?: SteamOwnedGame[];
  };
}

interface SteamResolveVanityResponse {
  response?: {
    success?: number;
    steamid?: string;
    message?: string;
  };
}

const PLAYED = completedStatusFor("game");
const STEAM64_RE = /^\d{17}$/;
const PAGE_SIZE = 50;
const IGDB_CONCURRENCY = 6;

function getSteamApiKey(): string {
  const key = process.env.STEAM_API_KEY?.trim();
  if (!key) throw new Error("Steam import is unavailable right now. Try again later.");
  return key;
}

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[™®©]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse a Steam64 ID, vanity username, or profile URL. */
export function parseSteamInput(raw: string): {
  steamId?: string;
  vanity?: string;
} {
  const input = raw.trim();
  if (!input) return {};

  if (STEAM64_RE.test(input)) {
    return { steamId: input };
  }

  const profilesMatch = input.match(/steamcommunity\.com\/profiles\/(\d{17})/i);
  if (profilesMatch?.[1]) {
    return { steamId: profilesMatch[1] };
  }

  const vanityMatch = input.match(/steamcommunity\.com\/id\/([^/?#]+)/i);
  if (vanityMatch?.[1]) {
    return { vanity: decodeURIComponent(vanityMatch[1]) };
  }

  if (/^[\w-]{2,32}$/i.test(input)) {
    return { vanity: input };
  }

  return {};
}

function steamApiError(status: number, context: string): Error {
  if (status === 401) {
    return new Error(
      "Steam API key is invalid. Check STEAM_API_KEY in your environment and create a new key at steamcommunity.com/dev/apikey if needed."
    );
  }
  if (status === 403) {
    return new Error(
      `${context} Steam denied access. Make sure your profile and game details are public.`
    );
  }
  return new Error(`Could not ${context.toLowerCase()} (${status})`);
}

async function resolveVanityUrl(vanity: string): Promise<string> {
  const key = getSteamApiKey();
  const url = new URL(
    "https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/"
  );
  url.searchParams.set("key", key);
  url.searchParams.set("vanityurl", vanity);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw steamApiError(res.status, "resolve Steam profile");
  }

  const data = (await res.json()) as SteamResolveVanityResponse;
  if (data.response?.success === 1 && data.response.steamid) {
    return data.response.steamid;
  }

  throw new Error(
    data.response?.message?.trim() || "Could not find a Steam profile for that ID or URL."
  );
}

export async function resolveSteamId(userInput: string): Promise<string> {
  const parsed = parseSteamInput(userInput);
  if (parsed.steamId) return parsed.steamId;
  if (parsed.vanity) return resolveVanityUrl(parsed.vanity);
  throw new Error("Enter a valid Steam ID or custom profile URL.");
}

async function fetchOwnedGames(steamId: string): Promise<SteamOwnedGame[]> {
  const key = getSteamApiKey();
  const url = new URL(
    "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/"
  );
  url.searchParams.set("key", key);
  url.searchParams.set("steamid", steamId);
  url.searchParams.set("include_appinfo", "true");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw steamApiError(res.status, "fetch Steam library");
  }

  const data = (await res.json()) as SteamOwnedGamesResponse;
  const games = data.response?.games ?? [];

  return games.filter((game) => (game.playtime_forever ?? 0) > 0 && game.name?.trim());
}

async function matchGameToIgdb(name: string): Promise<UnifiedMediaItem | null> {
  const query = name.trim();
  if (!query) return null;

  const results = await searchGames(query);
  if (results.length === 0) return null;

  const normalized = normalizeTitle(query);
  const exact = results.find(
    (item) => normalizeTitle(item.title) === normalized
  );
  return exact ?? results[0] ?? null;
}

async function mapGamesWithConcurrency(
  names: string[],
  concurrency: number
): Promise<Array<{ name: string; item: UnifiedMediaItem | null }>> {
  const output: Array<{ name: string; item: UnifiedMediaItem | null }> = [];

  for (let i = 0; i < names.length; i += concurrency) {
    const chunk = names.slice(i, i + concurrency);
    const matched = await Promise.all(
      chunk.map(async (name) => ({
        name,
        item: await matchGameToIgdb(name),
      }))
    );
    output.push(...matched);
  }

  return output;
}

async function findExistingLog(
  supabase: Supabase,
  userId: string,
  mediaId: string
): Promise<ExistingLog | undefined> {
  const { data } = await supabase
    .from("user_media_logs")
    .select("id, on_list, is_liked")
    .eq("user_id", userId)
    .eq("media_type", "game")
    .eq("media_id", mediaId)
    .limit(1)
    .maybeSingle();

  if (!data?.id) return undefined;
  return {
    id: String(data.id),
    on_list: data.on_list ?? null,
    is_liked: data.is_liked ?? null,
  };
}

async function updatePlayedLog(
  supabase: Supabase,
  existing: ExistingLog,
  item: UnifiedMediaItem
): Promise<void> {
  const now = new Date().toISOString();
  const fields: Record<string, unknown> = {
    status: PLAYED,
    on_list: Boolean(existing.on_list),
    is_liked: Boolean(existing.is_liked),
    updated_at: now,
    title: item.title,
    creator: item.creator,
    release_year: item.year,
    image_url: item.thumbnail,
  };

  const { error } = await supabase
    .from("user_media_logs")
    .update(fields)
    .eq("id", existing.id);

  if (!error) return;

  await supabase
    .from("user_media_logs")
    .update({
      status: PLAYED,
      on_list: Boolean(existing.on_list),
      is_liked: Boolean(existing.is_liked),
      updated_at: now,
    })
    .eq("id", existing.id);
}

async function upsertPlayedLog(
  supabase: Supabase,
  userId: string,
  item: UnifiedMediaItem,
  existing?: ExistingLog
): Promise<void> {
  if (existing?.id) {
    await updatePlayedLog(supabase, existing, item);
    return;
  }

  const now = new Date().toISOString();
  const { error: insertError } = await supabase.from("user_media_logs").insert({
    user_id: userId,
    media_id: item.id,
    media_type: "game",
    status: PLAYED,
    on_list: false,
    is_liked: false,
    updated_at: now,
    title: item.title,
    creator: item.creator,
    release_year: item.year,
    image_url: item.thumbnail,
  });

  if (!insertError) return;

  const raced = await findExistingLog(supabase, userId, item.id);
  if (raced) {
    await updatePlayedLog(supabase, raced, item);
    return;
  }

  await supabase.from("user_media_logs").insert({
    user_id: userId,
    media_id: item.id,
    media_type: "game",
    status: PLAYED,
    on_list: false,
    is_liked: false,
    updated_at: now,
  });
}

export type ImportSteamLibraryResult =
  | { ok: true; imported: number; skipped: number; total: number }
  | { ok: false; message: string };

export async function importSteamLibraryForUser(
  supabase: Supabase,
  userId: string,
  userInput: string
): Promise<ImportSteamLibraryResult> {
  const steamId = await resolveSteamId(userInput);
  const games = await fetchOwnedGames(steamId);

  if (games.length === 0) {
    return {
      ok: false,
      message:
        "No played games found. Make sure your Steam profile and game details are set to public.",
    };
  }

  const names = games.map((game) => game.name!.trim());
  const matched = await mapGamesWithConcurrency(names, IGDB_CONCURRENCY);
  const items = matched
    .map((entry) => entry.item)
    .filter((item): item is UnifiedMediaItem => Boolean(item));

  if (items.length === 0) {
    return {
      ok: true,
      imported: 0,
      skipped: games.length,
      total: games.length,
    };
  }

  const existingByMediaId = new Map<string, ExistingLog>();

  for (let i = 0; i < items.length; i += PAGE_SIZE) {
    const chunk = items.slice(i, i + PAGE_SIZE);
    const { data: existingLogs } = await supabase
      .from("user_media_logs")
      .select("id, media_id, on_list, is_liked")
      .eq("user_id", userId)
      .eq("media_type", "game")
      .in(
        "media_id",
        chunk.map((item) => item.id)
      );

    for (const log of existingLogs ?? []) {
      const mediaId = String(log.media_id);
      if (existingByMediaId.has(mediaId)) continue;
      existingByMediaId.set(mediaId, {
        id: String(log.id),
        on_list: log.on_list ?? null,
        is_liked: log.is_liked ?? null,
      });
    }
  }

  for (let i = 0; i < items.length; i += PAGE_SIZE) {
    const chunk = items.slice(i, i + PAGE_SIZE);
    await Promise.all(
      chunk.map((item) =>
        upsertPlayedLog(supabase, userId, item, existingByMediaId.get(item.id))
      )
    );
  }

  return {
    ok: true,
    imported: items.length,
    skipped: games.length - items.length,
    total: games.length,
  };
}
