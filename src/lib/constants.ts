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
    description: string;
  }
> = {
  movie: {
    href: "/movies",
    title: "Movies",
    popularHeading: "Trending Movies This Week",
    description:
      "What's hot on the big screen right now. Add favorites to your Top 4 stash.",
  },
  tv: {
    href: "/tv",
    title: "TV Shows",
    popularHeading: "Trending TV Shows This Week",
    description:
      "Series everyone is talking about. Save shows to your Top 4 stash.",
  },
  game: {
    href: "/games",
    title: "Games",
    popularHeading: "Popular Video Games",
    description:
      "Highly rated games ranked by community buzz. Build your Top 4 shelf.",
  },
  book: {
    href: "/books",
    title: "Books",
    popularHeading: "Trending Books",
    description:
      "What readers are diving into this week. Add titles to your Top 4.",
  },
  music: {
    href: "/music",
    title: "Music",
    popularHeading: "New & Popular Albums",
    description:
      "Fresh releases and standout albums. Stash your Top 4 albums.",
  },
};
