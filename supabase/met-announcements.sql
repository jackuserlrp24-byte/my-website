-- Met Police officer announcements (/met-police/announcements). Run once in the Supabase SQL editor (safe to re-run).
create table if not exists met_announcements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  body text not null,
  author text,
  pinned boolean not null default false
);

create index if not exists met_announcements_created_idx on met_announcements (created_at desc);

-- Same lock-down as the other tables: only the server (service role) can touch it.
alter table met_announcements enable row level security;
