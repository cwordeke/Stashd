-- Preferred media categories + onboarding completion flag
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_categories TEXT[] DEFAULT '{}'::text[];

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Anyone who already has a public handle is treated as finished
UPDATE public.profiles
SET onboarding_completed = TRUE
WHERE username IS NOT NULL
  AND COALESCE(onboarding_completed, FALSE) = FALSE;

NOTIFY pgrst, 'reload schema';
