import type { MediaType } from "@/lib/types";

/** Category grids: 4 rows × max 6 columns, two pages (initial + load more). */
export const MEDIA_GRID_ROWS = 4;
export const MEDIA_GRID_MAX_COLS = 6;
export const CATEGORY_TRENDING_LIMIT =
  MEDIA_GRID_ROWS * MEDIA_GRID_MAX_COLS * 2;

export const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/", label: "Home" },
  { href: "/movies", label: "Movies" },
  { href: "/tv", label: "TV" },
  { href: "/games", label: "Games" },
  { href: "/books", label: "Books" },
  { href: "/music", label: "Music" },
];

export const CATEGORY_META: Record<
  MediaType,
  {
    href: string;
    title: string;
    popularHeading: string;
  }
> = {
  movie: {
    href: "/movies",
    title: "Movies",
    popularHeading: "Trending Movies This Week",
  },
  tv: {
    href: "/tv",
    title: "TV Shows",
    popularHeading: "Trending TV Shows This Week",
  },
  game: {
    href: "/games",
    title: "Games",
    popularHeading: "Popular Video Games",
  },
  book: {
    href: "/books",
    title: "Books",
    popularHeading: "Trending Books",
  },
  music: {
    href: "/music",
    title: "Music",
    popularHeading: "New & Popular Albums",
  },
};
