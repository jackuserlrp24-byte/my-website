-- Run once in the Supabase SQL editor (safe to re-run)
-- ---------- Cancelled trainings ----------
alter table trainings add column if not exists cancelled_at timestamptz;
alter table trainings add column if not exists cancel_reason text;
