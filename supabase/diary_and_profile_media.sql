-- Matches the live diary_entries schema used in Supabase.
CREATE TABLE IF NOT EXISTS public.diary_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  media_id TEXT NOT NULL,
  media_type TEXT NOT NULL,
  title TEXT NOT NULL,
  -- creator is optional; app does not require it for inserts
  creator TEXT,
  image_url TEXT,
  release_year TEXT,
  rating NUMERIC(2, 1),
  is_liked BOOLEAN DEFAULT FALSE,
  is_rewatch BOOLEAN DEFAULT FALSE,
  review_text TEXT,
  watched_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS diary_entries_user_watched_idx
  ON public.diary_entries (user_id, watched_on DESC);

-- Ensure review + rewatch columns exist + refresh PostgREST schema cache
ALTER TABLE public.diary_entries
  ADD COLUMN IF NOT EXISTS is_rewatch BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS review_text TEXT;

NOTIFY pgrst, 'reload schema';

ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public can view diary entries"
    ON public.diary_entries FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert their own diary entries"
    ON public.diary_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own diary entries"
    ON public.diary_entries FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete their own diary entries"
    ON public.diary_entries FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Denormalized media metadata so profile Stash/Watchlist grids can render posters.
ALTER TABLE public.user_ratings
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS creator TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS release_year TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc', now());

ALTER TABLE public.user_media_logs
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS creator TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS release_year TEXT;
