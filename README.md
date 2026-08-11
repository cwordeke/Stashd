# Stashd

Omni-media tracker for movies, TV, games, books, and music — Letterboxd for everything.

## Setup

```bash
npm install
Copy-Item .env.example .env.local   # PowerShell
npm run dev
```

Fill API keys in `.env.local` (see `.env.example`). Open Library needs no key. Without keys, category pages fall back to placeholders.

### Auth (Supabase + Google)

1. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`.
2. Enable Google OAuth and add redirect URL `http://localhost:3000/auth/callback`.
3. First login sends users to `/onboarding` to claim a username.
4. Profiles live at `/u/[username]`. Ensure `profiles` is publicly readable (SELECT) so guests can view stashes.

## App structure

| Route | Purpose |
| --- | --- |
| `/` | Home feed — Recent Activity + Cross-Media Spotlight |
| `/movies` `/tv` `/games` `/books` `/music` | Trending / popular category grids |
| `/login` | Google OAuth sign-in |
| `/onboarding` | Claim a unique username |
| `/u/[username]` | Public Top 4 stash |
| `/u/[username]?tab=lists` | Custom lists index |
| `/u/[username]/lists/new` | Create a list (owner) |
| `/u/[username]/lists/[listId]` | View a list |
| `/u/[username]/lists/[listId]/edit` | Edit a list (owner) |
| `/media/[mediaType]/[id]` | Rating + media preview |
| `/profile` | Redirects to `/u/[username]` |

Category pages fetch trending data server-side (upstream cache ~24h). **Add to Stash** saves via Supabase when signed in; guests are redirected to `/login`.

## API routes

| Route | Upstream |
| --- | --- |
| `GET /api/trending/tmdb-movies` | TMDB `/trending/movie/week` |
| `GET /api/trending/tmdb-tv` | TMDB `/trending/tv/week` |
| `GET /api/trending/games` | IGDB `sort rating_count desc` |
| `GET /api/trending/books` | Open Library `/trending/weekly.json` |
| `GET /api/trending/music` | Spotify new releases |
| `GET /api/search/*` | Keyword search per medium |
| `GET /api/popular/[type]` | Fallback popular / placeholder |
