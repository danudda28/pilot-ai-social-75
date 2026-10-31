-- Social Spark production cron workers (pg_cron + pg_net).
-- Jobs call https://socialspark.ro/api/public/cron/* with the project's anon key in the apikey header.
-- Re-run safely: unschedules ss-* names then recreates them.
-- NOTE: replace ANON_KEY at apply-time if needed; live jobs were applied via Management API on 2026-10-31.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Applied remotely via API; this migration documents the intended schedules:
-- ss-publish-scheduled   '* * * * *'   /api/public/cron/publish-scheduled
-- ss-refresh-meta-tokens '0 4 * * *'   /api/public/cron/refresh-meta-tokens
-- ss-sync-meta-insights  '0 5 * * *'   /api/public/cron/sync-meta-insights
-- ss-daily-digest        '0 7 * * *'   /api/public/cron/daily-digest
-- ss-reset-quotas        '5 0 1 * *'   /api/public/cron/reset-quotas
