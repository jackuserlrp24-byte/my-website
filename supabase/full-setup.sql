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
-- Day (UK date) a division closes itself. It closes once that day has finished. Optional.
alter table divisions add column if not exists closes_on date;

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


-- ---------- Ban appeals (web form -> private ticket channel with Accept / Deny buttons) ----------
create table if not exists ban_appeals (
  id uuid primary key default gen_random_uuid(),
  discord_id text not null,
  username text,
  rp_name text,
  ban_reason text,              -- what the player says they were banned for
  appeal_reason text not null,  -- why they should be unbanned
  extra text,                   -- evidence / anything else
  status text not null default 'pending' check (status in ('pending', 'accepted', 'denied')),
  reviewed_by text,
  review_note text,
  channel_id text,              -- the private ticket channel
  message_id text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
-- For databases that already had ban_appeals: the single-use rejoin link created when an appeal is accepted
alter table ban_appeals add column if not exists invite_url text;

create unique index if not exists one_pending_appeal_per_user on ban_appeals (discord_id) where status = 'pending';
create index if not exists ban_appeals_discord_idx on ban_appeals (discord_id, created_at desc);

-- ---------- Lock out the anon key (the site uses the service-role key) ----------
alter table portal_settings enable row level security;
alter table divisions enable row level security;
alter table division_applications enable row level security;
alter table trainings enable row level security;
alter table role_requests enable row level security;
alter table moderation_logs enable row level security;
alter table game_actions enable row level security;
alter table ban_appeals enable row level security;

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

-- ---------- Command LOA (leave of absence) ----------
-- The portal checks each LOA request, approves or declines it, puts [LOA] after the member's Discord nickname
-- while it is active, and logs everything. Safe to re-run.
create table if not exists loa_requests (
  id uuid primary key default gen_random_uuid(),
  discord_id text not null,
  username text,
  display_name text,
  reason text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'approved' check (status in ('approved', 'active', 'declined', 'ended', 'cancelled')),
  decision_note text,          -- why it was approved / declined
  original_nick text,          -- the nickname before [LOA] was added (null = they had none)
  applied_nick text,           -- the nickname the bot set
  nickname_changed boolean not null default false,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists loa_requests_status_idx on loa_requests (status, end_date);
create index if not exists loa_requests_user_idx on loa_requests (discord_id, created_at desc);
alter table loa_requests enable row level security;


-- ---------- Training records (auto-filled when someone presses Attend) ----------
-- met_training_records is what the Met Police command dossier reads. This is a no-op if you already have it.
create table if not exists met_training_records (
  id uuid primary key default gen_random_uuid(),
  training_name text not null,
  target_discord_id text not null,
  notes text,
  issuer_name text,
  created_at timestamptz not null default now()
);
alter table met_training_records add column if not exists training_id text;
-- one auto record per person per training (manually logged rows have no training_id and are unaffected)
create unique index if not exists met_training_records_one_per_training
  on met_training_records (training_id, target_discord_id);

-- ---------- Cancelled trainings ----------
alter table trainings add column if not exists cancelled_at timestamptz;
alter table trainings add column if not exists cancel_reason text;


-- ---------- Staff requests (/staffrequest in game -> shown on the portal Staff Panel) ----------
create table if not exists staff_requests (
  id uuid primary key default gen_random_uuid(),
  external_ref text unique,        -- "<server start>-<in-game request number>" so the game can update the same row
  game_id int,
  player_name text,
  discord_id text,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'accepted', 'denied')),
  handled_by text,
  created_at timestamptz not null default now(),
  handled_at timestamptz
);
create index if not exists staff_requests_created_idx on staff_requests (created_at desc);
alter table staff_requests enable row level security;


-- ---------- Completed trainings (Complete button -> DM the instructor "did anyone leave?") ----------
alter table trainings add column if not exists completed_at timestamptz;
alter table trainings add column if not exists completed_by text;
alter table trainings add column if not exists host_id text;                          -- Discord ID of the instructor (gets the DM)
alter table trainings add column if not exists left_ids text[] not null default '{}'; -- people the instructor removed from the record

-- ---------- Training rooms (auto-assigned voice room; DM sent once everyone has left it) ----------
alter table trainings add column if not exists room_id text;                  -- Discord voice channel assigned to this training
alter table trainings add column if not exists room_seen boolean not null default false; -- someone has been seen in the room
alter table trainings add column if not exists room_empty_since timestamptz;  -- when the room was first seen empty after being used


-- ============================================================
-- MET POLICE OFFICER PORTAL (/met-police)
-- Announcements, bodycam, incidents, reports, checks, evidence, statements, officer details, duty rota (LOA page),
-- messages, and the Command tools (Police Collisions, Firearms PIP). Safe to re-run.
-- Needs the user_whitelists table you already have (roster / officer list).
-- ============================================================

-- ---------- Announcements (Communications > Notices & bulletins) ----------
create table if not exists met_announcements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  body text not null,
  author text,
  pinned boolean not null default false
);
create index if not exists met_announcements_created_idx on met_announcements (created_at desc);
alter table met_announcements add column if not exists kind text not null default 'notice';  -- 'notice' | 'bulletin'
alter table met_announcements enable row level security;

-- ---------- Bodycam footage (CO-AxonBodycam) ----------
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
  trigger text,                                -- hit | firearm | taser
  status text not null default 'uploading',   -- uploading | ready
  total_ms integer not null default 0,
  segments jsonb not null default '[]'::jsonb
);
alter table bodycam_incidents add column if not exists trigger text;
create index if not exists bodycam_incidents_created_idx on bodycam_incidents (created_at desc);
alter table bodycam_incidents enable row level security;
insert into storage.buckets (id, name, public) values ('bodycam', 'bodycam', false) on conflict (id) do nothing;

-- ---------- My Incidents ----------
create table if not exists met_incidents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reference text not null unique,            -- INC-123456
  title text not null,
  location text,
  details text,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  status text not null default 'open' check (status in ('open', 'closed')),
  assigned_to_id text,
  assigned_to_name text,
  created_by_id text not null,
  created_by_name text
);
create index if not exists met_incidents_assigned_idx on met_incidents (assigned_to_id);

create table if not exists met_incident_updates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  incident_id uuid not null references met_incidents(id) on delete cascade,
  author_id text not null,
  author_name text,
  body text not null
);
create index if not exists met_incident_updates_incident_idx on met_incident_updates (incident_id, created_at);

-- ---------- Reports (crime report, use of force, stop and search) ----------
create table if not exists met_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reference text not null unique,            -- CR-123456 / UOF-123456 / SS-123456
  type text not null check (type in ('crime', 'use_of_force', 'stop_search')),
  summary text not null,
  fields jsonb not null default '{}'::jsonb, -- the type-specific answers
  incident_ref text,
  author_id text not null,
  author_name text
);
create index if not exists met_reports_author_idx on met_reports (author_id, created_at desc);

-- ---------- Checks (simulated PNC / vehicle records that command maintains) ----------
create table if not exists met_pnc_persons (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  dob text,
  address text,
  markers text,                              -- e.g. "Violent, Weapons, Wanted"
  notes text,
  created_by_name text
);
create index if not exists met_pnc_persons_name_idx on met_pnc_persons (lower(full_name));

create table if not exists met_pnc_vehicles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  registration text not null,                -- stored without spaces, upper case
  make_model text,
  colour text,
  keeper text,
  status text,                               -- e.g. "Insured, MOT valid" / "Stolen"
  markers text,
  notes text,
  created_by_name text
);
create index if not exists met_pnc_vehicles_reg_idx on met_pnc_vehicles (registration);

create table if not exists met_check_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('person', 'vehicle')),
  query text not null,
  found boolean not null default false,
  officer_id text not null,
  officer_name text
);
create index if not exists met_check_log_officer_idx on met_check_log (officer_id, created_at desc);

-- ---------- Evidence ----------
create table if not exists met_evidence (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  exhibit_ref text not null unique,          -- EX-123456
  description text not null,
  incident_ref text,
  file_path text not null,
  file_name text not null,
  mime text,
  size_bytes integer not null default 0,
  uploaded_by_id text not null,
  uploaded_by_name text
);
create index if not exists met_evidence_uploader_idx on met_evidence (uploaded_by_id, created_at desc);

insert into storage.buckets (id, name, public)
values ('met-evidence', 'met-evidence', false)
on conflict (id) do nothing;

-- ---------- Statements (MG11) ----------
create table if not exists met_statements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reference text not null unique,            -- MG11-123456
  status text not null default 'submitted' check (status in ('draft', 'submitted')),
  witness_name text not null,
  witness_dob text,
  witness_occupation text,
  witness_address text,
  incident_ref text,
  body text not null,
  author_id text not null,
  author_name text,
  submitted_at timestamptz
);
create index if not exists met_statements_author_idx on met_statements (author_id, created_at desc);

-- ---------- My Details ----------
create table if not exists met_officer_details (
  discord_id text primary key,
  rank text,
  station text,
  team text,
  updated_by text,
  updated_at timestamptz not null default now()
);

-- ---------- Duty rota (shown only on the LOA page, command rank only) ----------
create table if not exists duty_rota (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  shift_date date not null,
  start_time text not null,                  -- HH:MM (UK time)
  end_time text not null,
  member_id text,
  member_name text not null,
  role_note text,
  created_by_name text
);
create index if not exists duty_rota_date_idx on duty_rota (shift_date, start_time);

-- ---------- Communications ----------
create table if not exists met_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  from_id text not null,
  from_name text,
  to_id text not null,
  to_name text,
  subject text not null,
  body text not null,
  read_at timestamptz
);
create index if not exists met_messages_to_idx on met_messages (to_id, created_at desc);
create index if not exists met_messages_from_idx on met_messages (from_id, created_at desc);

-- ---------- Command: Police Collisions (Driving Standards / Gold) ----------
create table if not exists met_collisions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reference text not null unique,            -- COL-123456
  collision_date date not null,
  officer_id text not null,
  officer_name text,
  vehicle text,
  location text not null,
  severity text not null default 'minor' check (severity in ('minor', 'moderate', 'serious', 'fatal')),
  injuries boolean not null default false,
  response_driving boolean not null default false,
  description text not null,
  status text not null default 'open' check (status in ('open', 'under_review', 'closed')),
  review_notes text,
  reviewed_by text,
  created_by_id text not null,
  created_by_name text
);
create index if not exists met_collisions_date_idx on met_collisions (collision_date desc);

-- ---------- Command: Firearms PIP (MO19 Command) ----------
create table if not exists met_firearms_pip (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reference text not null unique,            -- PIP-123456
  incident_date date not null,
  incident_ref text,
  location text not null,
  officers text not null,
  discharged boolean not null default false,
  rounds_fired integer not null default 0,
  injuries text,
  summary text not null,
  status text not null default 'open' check (status in ('open', 'under_review', 'closed')),
  checklist jsonb not null default '{}'::jsonb,
  review_notes text,
  reviewed_by text,
  created_by_id text not null,
  created_by_name text
);
create index if not exists met_firearms_pip_date_idx on met_firearms_pip (incident_date desc);

-- ---------- Lock-down: only the server (service role) can touch these ----------
alter table met_incidents enable row level security;
alter table met_incident_updates enable row level security;
alter table met_reports enable row level security;
alter table met_pnc_persons enable row level security;
alter table met_pnc_vehicles enable row level security;
alter table met_check_log enable row level security;
alter table met_evidence enable row level security;
alter table met_statements enable row level security;
alter table met_officer_details enable row level security;
alter table duty_rota enable row level security;
alter table met_messages enable row level security;
alter table met_collisions enable row level security;
alter table met_firearms_pip enable row level security;

