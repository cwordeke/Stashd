import { NextRequest, NextResponse } from "next/server";
import { getTwitchAccessToken, getTwitchClientId } from "@/lib/twitch";
import type { MediaItem, SearchResponse } from "@/lib/types";

interface IgdbGame {
  id: number;
  name?: string;
  first_release_date?: number;
  cover?: { url?: string };
  involved_companies?: Array<{
    developer?: boolean;
    publisher?: boolean;
    company?: { name?: string };
  }>;
}

function yearFromUnix(seconds?: number): string {
  if (!seconds) return "—";
  return String(new Date(seconds * 1000).getUTCFullYear());
}

function coverUrl(url?: string): string | null {
  if (!url) return null;
  const absolute = url.startsWith("//") ? `https:${url}` : url;
  return absolute.replace("t_thumb", "t_cover_small");
}

function pickStudio(game: IgdbGame): string {
  const companies = game.involved_companies ?? [];
  const developer = companies.find((c) => c.developer)?.company?.name;
  if (developer) return developer;
  const publisher = companies.find((c) => c.publisher)?.company?.name;
  if (publisher) return publisher;
  return companies[0]?.company?.name ?? "—";
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json(
      { results: [], error: "Missing query parameter `q`" } satisfies SearchResponse,
      { status: 400 }
    );
  }

  try {
    const token = await getTwitchAccessToken();
    const clientId = getTwitchClientId();

    const body = [
      `search "${query.replace(/"/g, '\\"')}";`,
      "fields name,first_release_date,cover.url,involved_companies.developer,involved_companies.publisher,involved_companies.company.name;",
      "limit 10;",
    ].join(" ");

    const res = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": clientId,
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "text/plain",
      },
      body,
    });

    if (!res.ok) {
      throw new Error(`IGDB request failed: ${res.status}`);
    }

    const data = (await res.json()) as IgdbGame[];

    const results: MediaItem[] = (data ?? []).map((game) => ({
      id: String(game.id),
      title: game.name ?? "Untitled",
      creator: pickStudio(game),
      year: yearFromUnix(game.first_release_date),
      thumbnail: coverUrl(game.cover?.url),
      mediaType: "game" as const,
    }));

    return NextResponse.json({ results } satisfies SearchResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "IGDB search failed";
    return NextResponse.json(
      { results: [], error: message } satisfies SearchResponse,
      { status: 502 }
    );
  }
}
