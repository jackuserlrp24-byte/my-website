-- Met Police Officer Portal (new tabs). Run once in the Supabase SQL editor (safe to re-run).
-- Also run supabase/met-announcements.sql and supabase/bodycam.sql if you have not already.

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

-- ---------- Duty ----------
create table if not exists met_duty_status (
  discord_id text primary key,
  name text,
  status text not null default 'off_duty' check (status in ('on_duty', 'off_duty', 'unavailable')),
  note text,
  updated_at timestamptz not null default now()
);

-- Duty rota. Shown ONLY on the LOA page and ONLY to Gold / Silver / Bronze command (and management).
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
alter table met_announcements add column if not exists kind text not null default 'notice';  -- 'notice' | 'bulletin'

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
alter table met_duty_status enable row level security;
alter table duty_rota enable row level security;
alter table met_messages enable row level security;
