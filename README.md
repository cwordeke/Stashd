# Stashd

Omni-media tracker for movies, TV, games, books, and music — Letterboxd for everything.

## Setup

```bash
npm install
Copy-Item .env.example .env.local   # PowerShell
npm run dev
```

Fill API keys in `.env.local` (see `.env.example`). Open Library needs no key. Without keys, category pages fall back to placeholders.

## App structure

| Route | Purpose |
| --- | --- |
| `/` | Home feed — Recent Activity + Cross-Media Spotlight |
| `/movies` `/tv` `/games` `/books` `/music` | Category popular grids |
| `/profile` | My Stash — Top 4 shelves per medium |

Global Search opens from the navbar. Results use normalized `UnifiedMediaItem` cards with **Add to Stash**. Empty Top 4 slots open search pre-filtered to that category. Stash data is stored in `localStorage`.

## API routes

| Route | Upstream |
| --- | --- |
| `GET /api/search/tmdb?q=` | TMDB multi search |
| `GET /api/search/games?q=` | IGDB |
| `GET /api/search/books?q=` | Open Library |
| `GET /api/search/music?q=` | Spotify |
| `GET /api/popular/[type]` | Popular / trending per medium |
