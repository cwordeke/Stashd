-- Top 4 slot order. Run in the Supabase SQL editor.

ALTER TABLE public.stash_items
  ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, media_type
      ORDER BY created_at ASC, id ASC
    ) - 1 AS pos
  FROM public.stash_items
)
UPDATE public.stash_items AS s
SET position = ranked.pos
FROM ranked
WHERE s.id = ranked.id;

CREATE INDEX IF NOT EXISTS stash_items_user_type_position_idx
  ON public.stash_items (user_id, media_type, position ASC);

DO $$ BEGIN
  CREATE POLICY "Users can update their own stash items"
    ON public.stash_items FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
