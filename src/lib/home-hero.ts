import { tmdbBackdrop } from "@/lib/media";
import { mediaDetailPath } from "@/lib/types";

export interface HeroSlide {
  imageUrl: string;
  title: string;
  subtitle: string;
  href: string;
  /** How the image should be framed inside the banner */
  fit: "backdrop" | "poster";
}

interface TmdbTrendingItem {
  id: number;
  title?: string;
  name?: string;
  backdrop_path?: string | null;
}

async function getTmdbHeroSlides(
  mediaType: "movie" | "tv",
  limit: number
): Promise<HeroSlide[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return [];

  const url = new URL(
    `https://api.themoviedb.org/3/trending/${mediaType}/week`
  );
  url.searchParams.set("api_key", apiKey);

  const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
  if (!res.ok) return [];

  const data = (await res.json()) as { results?: TmdbTrendingItem[] };
  const slides: HeroSlide[] = [];

  for (const item of data.results ?? []) {
    const imageUrl = tmdbBackdrop(item.backdrop_path, "w1280");
    if (!imageUrl) continue;

    slides.push({
      imageUrl,
      title: (mediaType === "movie" ? item.title : item.name) ?? "Untitled",
      subtitle: mediaType === "movie" ? "Movie" : "TV Show",
      href: mediaDetailPath(mediaType, String(item.id)),
      fit: "backdrop",
    });
    if (slides.length >= limit) break;
  }

  return slides;
}

function interleaveSlides(groups: HeroSlide[][], limit: number): HeroSlide[] {
  const out: HeroSlide[] = [];
  let index = 0;

  while (out.length < limit) {
    let added = false;
    for (const group of groups) {
      const slide = group[index];
      if (!slide) continue;
      out.push(slide);
      added = true;
      if (out.length >= limit) break;
    }
    if (!added) break;
    index += 1;
  }

  return out;
}

/** Cinematic hero imagery — TMDB backdrops only so framing stays landscape. */
export async function getHeroSlides(limit = 8): Promise<HeroSlide[]> {
  const [movies, tv] = await Promise.allSettled([
    getTmdbHeroSlides("movie", limit),
    getTmdbHeroSlides("tv", limit),
  ]);

  const movieSlides = movies.status === "fulfilled" ? movies.value : [];
  const tvSlides = tv.status === "fulfilled" ? tv.value : [];

  return interleaveSlides([movieSlides, tvSlides], limit);
}
