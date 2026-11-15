-- Bodycam footage (CO-AxonBodycam). Run once in the Supabase SQL editor.
create table if not exists bodycam_incidents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  officer_name text,
  officer_discord_id text,
  target_name text,
  target_discord_id text,
  weapon text,
  serial text,
  coords text,
  status text not null default 'uploading',   -- uploading | ready
  total_ms integer not null default 0,
  segments jsonb not null default '[]'::jsonb   -- [{ "path": "<id>/000.webm", "ms": 10000 }, ...]
);

create index if not exists bodycam_incidents_created_idx on bodycam_incidents (created_at desc);

-- Same lock-down as the other tables: only the server (service role) can touch it.
alter table bodycam_incidents enable row level security;

-- Private bucket for the video segments.
insert into storage.buckets (id, name, public)
values ('bodycam', 'bodycam', false)
on conflict (id) do nothing;
