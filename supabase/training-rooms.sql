-- Run once in the Supabase SQL editor (safe to re-run). Run supabase/training-complete.sql first.
-- ---------- Training rooms ----------
alter table trainings add column if not exists room_id text;                 -- Discord voice channel assigned to this training
alter table trainings add column if not exists room_seen boolean not null default false; -- someone has been seen in the room
alter table trainings add column if not exists room_empty_since timestamptz;  -- when the room was first seen empty (after being used)
