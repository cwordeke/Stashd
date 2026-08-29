import { tmdbBackdrop } from "@/lib/media";
import { fetchTmdbTrendingWeekPage } from "@/lib/providers/tmdb";
import { mediaDetailPath } from "@/lib/types";
import { withTimeout } from "@/lib/with-timeout";

const HERO_FETCH_TIMEOUT_MS = 6_000;

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
  const data = await fetchTmdbTrendingWeekPage(mediaType, 1);
  const slides: HeroSlide[] = [];

  for (const item of (data.results ?? []) as TmdbTrendingItem[]) {
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
  return withTimeout(loadHeroSlides(limit), HERO_FETCH_TIMEOUT_MS, []);
}

async function loadHeroSlides(limit = 8): Promise<HeroSlide[]> {
  const [movies, tv] = await Promise.allSettled([
    getTmdbHeroSlides("movie", limit),
    getTmdbHeroSlides("tv", limit),
  ]);

  const movieSlides = movies.status === "fulfilled" ? movies.value : [];
  const tvSlides = tv.status === "fulfilled" ? tv.value : [];

  return interleaveSlides([movieSlides, tvSlides], limit);
}
