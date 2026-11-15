-- Run once in the Supabase SQL editor (after trainings-divisions.sql).

alter table trainings add column if not exists requires_ipp boolean not null default true;

create table if not exists role_requests (
  id uuid primary key default gen_random_uuid(),
  target_discord_id text not null,
  target_name text,
  role_key text not null,
  reason text,
  requested_by text not null,
  requested_by_id text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  reviewed_by text,
  discord_message_id text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table role_requests enable row level security;
