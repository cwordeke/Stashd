# Stashd

Movies, TV shows, video games, books, and music.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables and fill in your API keys:

```bash
cp .env.example .env.local
```

| Variable | Source |
| --- | --- |
| `TMDB_API_KEY` | [TMDB API settings](https://www.themoviedb.org/settings/api) |
| `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` | [Twitch Developer Console](https://dev.twitch.tv/console/apps) (used for IGDB) |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) |

Open Library requires no API key.

3. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API routes

All keys stay server-side. The frontend only calls these Next.js routes:

| Route | Upstream |
| --- | --- |
| `GET /api/search/tmdb?q=` | TMDB `/search/multi` (split into movies + TV) |
| `GET /api/search/games?q=` | IGDB `/games` via Twitch OAuth |
| `GET /api/search/books?q=` | Open Library Search API |
| `GET /api/search/music?q=` | Spotify Search (`album,track`) |

## Notes

- Movie/TV director and studio fields are often unavailable from TMDB multi-search; those rows show `—` for creator.
- Failed mediums show an error in their own column without breaking the others.
