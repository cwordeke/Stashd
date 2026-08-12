-- Social graph. Run in the Supabase SQL editor.
-- Safe to re-run: table/policies/indexes use IF NOT EXISTS / duplicate guards.

CREATE TABLE IF NOT EXISTS public.follows (
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT follows_no_self CHECK (follower_id <> following_id)
);

-- PK (follower_id, following_id) covers "who I follow" + membership checks.
-- following_id index is required for "who follows this user" / follower counts.
CREATE INDEX IF NOT EXISTS follows_following_id_idx
  ON public.follows (following_id);

CREATE INDEX IF NOT EXISTS follows_follower_id_idx
  ON public.follows (follower_id);

-- Username lookup: leading-wildcard ILIKE needs trigram, not btree.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS profiles_username_trgm_idx
  ON public.profiles USING gin (username gin_trgm_ops);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can view follows"
    ON public.follows FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can follow as themselves"
    ON public.follows FOR INSERT
    WITH CHECK (auth.uid() = follower_id AND follower_id <> following_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can unfollow as themselves"
    ON public.follows FOR DELETE
    USING (auth.uid() = follower_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
