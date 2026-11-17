-- Run once in the Supabase SQL editor.
create table if not exists met_officer_photos (
  discord_id text primary key,
  photo      text not null,                 -- small JPEG as a data URI (about 20-30 KB)
  source     text not null default 'game',  -- 'game' (auto uniform photo) or 'upload' (uploaded on the website)
  updated_at timestamptz not null default now()
);
alter table met_officer_photos enable row level security;   -- only the server (service role) touches this table
