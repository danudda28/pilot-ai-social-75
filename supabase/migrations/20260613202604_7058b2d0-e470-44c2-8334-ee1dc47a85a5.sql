
ALTER TABLE public.generated_posts
  ADD COLUMN IF NOT EXISTS target_profile_ids text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_publish_error text,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

CREATE INDEX IF NOT EXISTS generated_posts_due_idx
  ON public.generated_posts (status, scheduled_date)
  WHERE status = 'scheduled';
