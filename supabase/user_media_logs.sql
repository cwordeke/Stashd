-- Required columns for independent Watched + Watchlist + Like toggles:
--   status   TEXT     → completed only: watched | played | read | listened | null
--   on_list  BOOLEAN  → watchlist / backlog / reading list / queue
--   is_liked BOOLEAN  → heart

ALTER TABLE public.user_media_logs
  ADD COLUMN IF NOT EXISTS on_list BOOLEAN DEFAULT FALSE;

ALTER TABLE public.user_media_logs
  ADD COLUMN IF NOT EXISTS is_liked BOOLEAN DEFAULT FALSE;

-- Backfill on_list from older list-style status values (if any)
UPDATE public.user_media_logs
SET on_list = TRUE
WHERE status IN ('watchlist', 'backlog', 'reading_list', 'queue');

-- Normalize status to completed-only values
UPDATE public.user_media_logs
SET status = NULL
WHERE status IN ('watchlist', 'backlog', 'reading_list', 'queue');
