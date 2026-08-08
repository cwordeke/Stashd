-- Add profile bio support
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT;

-- Optional: keep bios reasonably short at the DB level
DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_bio_length CHECK (bio IS NULL OR char_length(bio) <= 280);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
