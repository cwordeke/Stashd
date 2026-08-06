import type { MediaType, UnifiedMediaItem } from "@/lib/types";
import { getPopularMovies, getPopularTv } from "@/lib/providers/tmdb";
import { getPopularGames } from "@/lib/providers/igdb";
import { getPopularBooks } from "@/lib/providers/openlibrary";
import { getPopularMusic } from "@/lib/providers/spotify";

/** Static fallbacks when API keys are missing or upstream fails */
const PLACEHOLDERS: Record<MediaType, UnifiedMediaItem[]> = {
  movie: [
    {
      id: "ph-movie-1",
      title: "Blade Runner 2049",
      creator: "Denis Villeneuve",
      year: "2017",
      thumbnail: null,
      mediaType: "movie",
    },
    {
      id: "ph-movie-2",
      title: "The Matrix",
      creator: "Wachowski Sisters",
      year: "1999",
      thumbnail: null,
      mediaType: "movie",
    },
    {
      id: "ph-movie-3",
      title: "Dune",
      creator: "Denis Villeneuve",
      year: "2021",
      thumbnail: null,
      mediaType: "movie",
    },
    {
      id: "ph-movie-4",
      title: "Inception",
      creator: "Christopher Nolan",
      year: "2010",
      thumbnail: null,
      mediaType: "movie",
    },
    {
      id: "ph-movie-5",
      title: "Interstellar",
      creator: "Christopher Nolan",
      year: "2014",
      thumbnail: null,
      mediaType: "movie",
    },
    {
      id: "ph-movie-6",
      title: "Arrival",
      creator: "Denis Villeneuve",
      year: "2016",
      thumbnail: null,
      mediaType: "movie",
    },
  ],
  tv: [
    {
      id: "ph-tv-1",
      title: "The Bear",
      creator: "Christopher Storer",
      year: "2022",
      thumbnail: null,
      mediaType: "tv",
    },
    {
      id: "ph-tv-2",
      title: "Severance",
      creator: "Dan Erickson",
      year: "2022",
      thumbnail: null,
      mediaType: "tv",
    },
    {
      id: "ph-tv-3",
      title: "Andor",
      creator: "Tony Gilroy",
      year: "2022",
      thumbnail: null,
      mediaType: "tv",
    },
    {
      id: "ph-tv-4",
      title: "The Last of Us",
      creator: "Craig Mazin",
      year: "2023",
      thumbnail: null,
      mediaType: "tv",
    },
    {
      id: "ph-tv-5",
      title: "Shogun",
      creator: "Rachel Kondo",
      year: "2024",
      thumbnail: null,
      mediaType: "tv",
    },
    {
      id: "ph-tv-6",
      title: "Fallout",
      creator: "Geneva Robertson-Dworet",
      year: "2024",
      thumbnail: null,
      mediaType: "tv",
    },
  ],
  game: [
    {
      id: "ph-game-1",
      title: "Elden Ring",
      creator: "FromSoftware",
      year: "2022",
      thumbnail: null,
      mediaType: "game",
    },
    {
      id: "ph-game-2",
      title: "Hades",
      creator: "Supergiant Games",
      year: "2020",
      thumbnail: null,
      mediaType: "game",
    },
    {
      id: "ph-game-3",
      title: "Baldur's Gate 3",
      creator: "Larian Studios",
      year: "2023",
      thumbnail: null,
      mediaType: "game",
    },
    {
      id: "ph-game-4",
      title: "Celeste",
      creator: "Maddy Makes Games",
      year: "2018",
      thumbnail: null,
      mediaType: "game",
    },
    {
      id: "ph-game-5",
      title: "Hollow Knight",
      creator: "Team Cherry",
      year: "2017",
      thumbnail: null,
      mediaType: "game",
    },
    {
      id: "ph-game-6",
      title: "Disco Elysium",
      creator: "ZA/UM",
      year: "2019",
      thumbnail: null,
      mediaType: "game",
    },
  ],
  book: [
    {
      id: "ph-book-1",
      title: "Dune",
      creator: "Frank Herbert",
      year: "1965",
      thumbnail: null,
      mediaType: "book",
    },
    {
      id: "ph-book-2",
      title: "Neuromancer",
      creator: "William Gibson",
      year: "1984",
      thumbnail: null,
      mediaType: "book",
    },
    {
      id: "ph-book-3",
      title: "The Left Hand of Darkness",
      creator: "Ursula K. Le Guin",
      year: "1969",
      thumbnail: null,
      mediaType: "book",
    },
    {
      id: "ph-book-4",
      title: "Snow Crash",
      creator: "Neal Stephenson",
      year: "1992",
      thumbnail: null,
      mediaType: "book",
    },
    {
      id: "ph-book-5",
      title: "Project Hail Mary",
      creator: "Andy Weir",
      year: "2021",
      thumbnail: null,
      mediaType: "book",
    },
    {
      id: "ph-book-6",
      title: "Klara and the Sun",
      creator: "Kazuo Ishiguro",
      year: "2021",
      thumbnail: null,
      mediaType: "book",
    },
  ],
  music: [
    {
      id: "ph-music-1",
      title: "Random Access Memories",
      creator: "Daft Punk",
      year: "2013",
      thumbnail: null,
      mediaType: "music",
    },
    {
      id: "ph-music-2",
      title: "To Pimp a Butterfly",
      creator: "Kendrick Lamar",
      year: "2015",
      thumbnail: null,
      mediaType: "music",
    },
    {
      id: "ph-music-3",
      title: "Blonde",
      creator: "Frank Ocean",
      year: "2016",
      thumbnail: null,
      mediaType: "music",
    },
    {
      id: "ph-music-4",
      title: "OK Computer",
      creator: "Radiohead",
      year: "1997",
      thumbnail: null,
      mediaType: "music",
    },
    {
      id: "ph-music-5",
      title: "Future Nostalgia",
      creator: "Dua Lipa",
      year: "2020",
      thumbnail: null,
      mediaType: "music",
    },
    {
      id: "ph-music-6",
      title: "After Hours",
      creator: "The Weeknd",
      year: "2020",
      thumbnail: null,
      mediaType: "music",
    },
  ],
};

export function getPlaceholderResults(type: MediaType): UnifiedMediaItem[] {
  return PLACEHOLDERS[type];
}

export async function getPopularForType(
  type: MediaType
): Promise<{ results: UnifiedMediaItem[]; source: "live" | "placeholder" }> {
  try {
    let results: UnifiedMediaItem[] = [];
    switch (type) {
      case "movie":
        results = await getPopularMovies();
        break;
      case "tv":
        results = await getPopularTv();
        break;
      case "game":
        results = await getPopularGames();
        break;
      case "book":
        results = await getPopularBooks();
        break;
      case "music":
        results = await getPopularMusic();
        break;
    }

    if (!results.length) {
      return { results: PLACEHOLDERS[type], source: "placeholder" };
    }

    return { results, source: "live" };
  } catch {
    return { results: PLACEHOLDERS[type], source: "placeholder" };
  }
}
