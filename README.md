# Stashd 📦

**A social media diary for everything you watch, play, read, and listen to.**

**Website:** [stashd.site](https://stashd.site)

![Next.js](https://img.shields.io/badge/next.js-%23000000.svg?style=for-the-badge\&logo=nextdotjs\&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge\&logo=react\&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge\&logo=typescript\&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge\&logo=tailwind-css\&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge\&logo=supabase\&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge\&logo=postgresql\&logoColor=white)
![Vercel](https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge\&logo=vercel\&logoColor=white)

---

## Overview

**Stashd** brings movies, TV shows, video games, books, and music into one profile.

Users can build a **Top 4** for each media type, keep a chronological **Diary**, rate and review media, track their history, and follow friends to see what they're watching, playing, reading, and listening to.

Stashd is built with **Next.js 15**, **React 19**, **TypeScript**, **Supabase**, and **PostgreSQL**, with data aggregated across several external media APIs.

---

## Core Features

### Media Taste Profile

Track five types of media from a single account:

* Movies
* TV shows
* Video games
* Books
* Music

Each type uses a shared data model while keeping media-specific metadata.

### Ratings, Reviews & Diary

Log media with:

* 0.5–5.0 star ratings
* Written reviews
* Date tracking
* First-time and repeat viewing/play tracking
* Likes and favorites
* Chronological diary history

### Top 4

Create a personal **Top 4** for each media category.

Updates use optimistic client state so profile changes appear immediately while database mutations run in the background.

### Social Activity Feed

Follow other users and see their activity through the home feed containing:

* Recent logs
* Ratings
* Reviews
* Follow activity
* Popular media
* New releases

### Import Hub

Bring existing media libraries into Stashd through dedicated import pipelines.

**Letterboxd**

* `.zip` archive extraction in the browser
* `.csv` parsing with JSZip and PapaParse
* Automatic movie matching through TMDB

**Spotify**

* OAuth 2.0 authentication
* Saved album and library importing
* Spotify metadata integration

**Steam** - **Coming Soon*

* Steam ID and Vanity URL lookup
* Steam Web API library retrieval
* IGDB metadata matching

**Goodreads** - *Coming Soon*

### Profile Statistics

User activity is combined into profile statistics including rating distributions and media history.

Rating histograms are calculated dynamically from stored user data.

### Media Pages

Each media item has a dedicated detail page with:

* Artwork and backdrop imagery
* Description and metadata
* Ratings
* Community reviews
* User activity
* Responsive fallbacks for media without backdrop artwork

---

## Tech Stack

### Frontend

* **Next.js 15** - App Router, Server Actions, Streaming & Suspense
* **React 19**
* **TypeScript**

### Styling & UI

* **Tailwind CSS**
* **Framer Motion**
* **Lucide React**

### Backend & Database

* **Supabase**
* **PostgreSQL**
* **Supabase Auth**
* **Row Level Security (RLS)**
* **Next.js API Route Handlers**

### External APIs

| API                 | Usage                              |
| ------------------- | ---------------------------------- |
| **TMDB**            | Movies and TV shows                |
| **Twitch / IGDB**   | Video game metadata                |
| **Spotify Web API** | Music metadata and account imports |
| **Steam Web API**   | Steam library imports              |

---

## Architecture

### Unified Media Model

Each external API returns media using a different data structure. Stashd normalizes these responses into a shared TypeScript model used throughout the application.

```typescript
export interface UnifiedMediaItem {
  id: string;
  media_type: 'movie' | 'tv' | 'game' | 'book' | 'music';
  title: string;
  creator?: string;
  release_year?: string;
  image_url: string;
  backdrop_url?: string;
  description?: string;
}
```

This allows components such as search results, profile shelves, ratings, and activity feeds to work across different media types without requiring separate implementations for each API.

### Optimistic UI

Interactive actions such as shelf management and ratings update client state immediately using React's `useOptimistic`.

Database mutations are processed against Supabase in the background. Failed mutations or validation errors can roll the interface back to its previous state.

### Client-Side Import Pipeline

Stashd processes supported media exports directly in the browser.

For Letterboxd imports:

```text
.zip archive
     ↓
JSZip extraction
     ↓
CSV discovery
     ↓
PapaParse
     ↓
Record normalization
     ↓
TMDB matching
     ↓
Supabase
```

This avoids uploading the original archive to the application server and allows imported records to be processed in batches.

### Authentication & Data Security

Authentication is handled through Supabase Auth using:

* Email and password
* Google OAuth
* Server-side session management with `@supabase/ssr`

PostgreSQL tables use **Row Level Security policies** to restrict protected operations to authenticated and authorized users.

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/cwordeke/stashd.git
cd stashd
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# TMDB
TMDB_API_KEY=your_tmdb_api_key

# Twitch / IGDB
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret

# Spotify
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/spotify/callback

# Steam
STEAM_API_KEY=your_steam_web_api_key
```

### 4. Start the Development Server

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Deployment

Stashd is deployed on **Vercel** with a custom domain and automatic SSL.

**Production:** [stashd.site](https://stashd.site)

Production environment variables and OAuth callback URLs are configured separately from the local development environment.

---

## Author

Built by **Carson Wordekemper**

[GitHub](https://github.com/cwordeke)
