-- PostgREST nested selects for the home feed.
-- Adds profiles FKs alongside the existing auth.users FKs so
-- diary_entries / follows can embed username + avatar_url in one query.
-- Safe to re-run.

DO $$ BEGIN
  ALTER TABLE public.diary_entries
    ADD CONSTRAINT diary_entries_user_profile_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.follows
    ADD CONSTRAINT follows_follower_profile_fkey
    FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.follows
    ADD CONSTRAINT follows_following_profile_fkey
    FOREIGN KEY (following_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
