-- Run once in the Supabase SQL editor (safe to re-run)
-- ---------- Completed trainings ----------
alter table trainings add column if not exists completed_at timestamptz;
alter table trainings add column if not exists completed_by text;
alter table trainings add column if not exists host_id text;                       -- Discord ID of the instructor (gets the "did anyone leave?" DM)
alter table trainings add column if not exists left_ids text[] not null default '{}'; -- people the instructor removed from the record
