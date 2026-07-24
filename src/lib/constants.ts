import type { MediaType } from "@/lib/types";

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
  { href: string; title: string; popularHeading: string }
> = {
  movie: {
    href: "/movies",
    title: "Movies",
    popularHeading: "Popular Movies",
  },
  tv: {
    href: "/tv",
    title: "TV Shows",
    popularHeading: "Popular TV Shows",
  },
  game: {
    href: "/games",
    title: "Games",
    popularHeading: "Popular Games",
  },
  book: {
    href: "/books",
    title: "Books",
    popularHeading: "Popular Books",
  },
  music: {
    href: "/music",
    title: "Music",
    popularHeading: "Popular Albums",
  },
};
