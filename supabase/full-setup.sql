-- ============================================================
-- Central Operations Portal - FULL Supabase setup
-- Paste into the Supabase SQL editor and run once.
-- Safe to re-run: it never deletes data or resets division open/closed status.
-- ============================================================

-- ---------- Settings ----------
create table if not exists portal_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

-- ---------- Divisions ----------
create table if not exists divisions (
  id text primary key,
  name text not null,
  department text not null default 'MET POLICE',
  description text,
  sort_order int not null default 0,
  status text not null default 'closed' check (status in ('open', 'closed')),
  application_url text,   -- Google Form link; opens when someone clicks the division name
  updated_by text,
  updated_at timestamptz not null default now()
);

-- For databases that already had the divisions table:
alter table divisions add column if not exists application_url text;
-- Discord role given to people accepted into the division (optional)
alter table divisions add column if not exists discord_role_id text;

create table if not exists division_applications (
  id uuid primary key default gen_random_uuid(),
  division_id text not null references divisions(id) on delete cascade,
  discord_id text not null,
  applicant_name text not null,
  reason text not null,
  experience text,
  availability text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  reviewed_by text,
  review_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- One pending application per person per division
create unique index if not exists one_pending_application_per_division
  on division_applications (division_id, discord_id)
  where status = 'pending';

-- ---------- Trainings ----------
create sequence if not exists training_seq;

create table if not exists trainings (
  id text primary key default ('TRN-' || lpad(nextval('training_seq')::text, 3, '0')),
  title text not null,
  division_id text references divisions(id) on delete set null,
  host text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  description text,
  image_url text,
  discord_message_id text,
  discord_channel_id text,
  attending text[] not null default '{}',
  attending_ids text[] not null default '{}', -- Discord IDs of attendees (used to DM them when delayed)
  unattending text[] not null default '{}',   -- students who pressed "Can't make it"
  requires_ipp boolean not null default true, -- true = only IPP + Advanced can attend
  delayed_minutes int not null default 0,     -- total minutes a trainer has delayed the session
  delay_reason text,
  original_starts_at timestamptz,             -- start time before the first delay
  created_at timestamptz not null default now()
);

-- For databases that already had the trainings table (adds the Can't Make It + Delay columns):
alter table trainings add column if not exists requires_ipp boolean not null default true;
alter table trainings add column if not exists attending_ids text[] not null default '{}';
alter table trainings add column if not exists delayed_minutes int not null default 0;
alter table trainings add column if not exists delay_reason text;
alter table trainings add column if not exists original_starts_at timestamptz;

-- ---------- Role requests (trainer panel) ----------
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

-- ---------- Moderation logs (staff panel + Management > Moderation Logs) ----------
-- Already exists on your project, so this does nothing there. Only creates it on a fresh database.
create table if not exists moderation_logs (
  id uuid primary key default gen_random_uuid(),
  discord_id text not null,
  username text,
  action_type text not null,   -- NOTE, WARN, KICK, BAN, UNBAN
  reason text,
  moderator_name text,
  created_at timestamptz not null default now()
);

-- ---------- In-game actions (portal staff panel -> FiveM server) ----------
-- The CO-StaffMenu resource polls /api/ingame-moderation/queue and applies these in the game.
create table if not exists game_actions (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action in ('warn', 'kick', 'ban', 'unban')),
  target_discord_id text not null,
  target_name text,
  reason text not null,
  duration_hours int not null default 0,   -- bans only; 0 = permanent
  requested_by text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'done', 'failed', 'expired')),
  result text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists game_actions_status_idx on game_actions (status, created_at);

-- ---------- Lock out the anon key (the site uses the service-role key) ----------
alter table portal_settings enable row level security;
alter table divisions enable row level security;
alter table division_applications enable row level security;
alter table trainings enable row level security;
alter table role_requests enable row level security;
alter table moderation_logs enable row level security;
alter table game_actions enable row level security;

-- ---------- Seed / refresh divisions ----------
-- Updates names, descriptions and order, but never touches open/closed status.
insert into divisions (id, name, department, description, sort_order) values
  ('fp-frontline',   'FP | Emergency Response & Patrol Team',  'MET POLICE', 'Emergency response and patrol policing.', 1),
  ('fp-area-driver', 'FP | Area Driver',                       'MET POLICE', 'Area driver qualifications and pursuit protocols.', 2),
  ('fp-snt',         'FP | Safer Neighbourhoods Team',         'MET POLICE', 'Community engagement and local policing.', 3),
  ('fp-vsu',         'FP | Violence Suppression Unit',         'MET POLICE', 'Proactive operations and targeted intervention.', 4),
  ('mo2',            'MO2 | Criminal Investigation Department','MET POLICE', 'Detectives, case files, suspect interviews and evidence.', 5),
  ('mo3',            'MO3 | Covert Policing',                  'MET POLICE', 'Surveillance and undercover operations.', 6),
  ('mo4',            'MO4 | Forensic Services',                'MET POLICE', 'Crime scene examination and forensic submissions.', 7),
  ('mo6',            'MO6 | Public Order Planning',            'MET POLICE', 'Public order planning and PSU deployments.', 8),
  ('mo7',            'MO7 | Taskforce',                        'MET POLICE', 'Specialist proactive taskforce operations.', 9),
  ('mo8',            'MO8 | Roads Transport Policing Command', 'MET POLICE', 'Pursuits, ANPR, motorway and traffic enforcement.', 10),
  ('mo9',            'MO9 | Met Detention',                    'MET POLICE', 'Custody suite and prisoner processing.', 11),
  ('mo12',           'MO12 | MetCC',                           'MET POLICE', 'Control room dispatch and radio procedures.', 12),
  ('mo19',           'MO19 | Firearms Command',                'MET POLICE', 'Authorised Firearms Officers and ARV.', 13)
on conflict (id) do update set
  name = excluded.name,
  department = excluded.department,
  description = excluded.description,
  sort_order = excluded.sort_order;

-- ---------- Recruitment divisions: LAS, LFB, Control ----------
-- New divisions start CLOSED. Open them from the portal (Divisions page or the LAS / LFB Command suite).
-- discord_role_id = role given when an application is accepted. Seeded on first run only; edit it later in Supabase.
insert into divisions (id, name, department, description, sort_order, discord_role_id) values
  ('las-recruitment',     'LAS | Recruitment',     'LAS',     'London Ambulance Service recruitment.', 1, '1571508649824620645'),
  ('lfb-recruitment',     'LFB | Recruitment',     'LFB',     'London Fire Brigade recruitment.',      1, '1571508649824620645'),
  ('control-recruitment', 'Control | Recruitment', 'CONTROL', 'Control room recruitment.',             1, '1571508649824620645')
on conflict (id) do update set
  name = excluded.name,
  department = excluded.department,
  description = excluded.description,
  sort_order = excluded.sort_order;

-- ---------- Optional ----------
-- Existing trainings default to "IPP + Advanced only". To open every existing one up, uncomment:
-- update trainings set requires_ipp = false;