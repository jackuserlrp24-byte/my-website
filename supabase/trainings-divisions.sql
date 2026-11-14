-- Run this once in the Supabase SQL editor.
-- Tables for: trainings, division open/closed status, division applications.

create table if not exists portal_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

create table if not exists divisions (
  id text primary key,
  name text not null,
  department text not null default 'MET POLICE',
  description text,
  sort_order int not null default 0,
  status text not null default 'closed' check (status in ('open', 'closed')),
  updated_by text,
  updated_at timestamptz not null default now()
);

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
  unattending text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- The site only talks to these through the service-role key, so lock out the anon key.
alter table portal_settings enable row level security;
alter table divisions enable row level security;
alter table division_applications enable row level security;
alter table trainings enable row level security;

insert into divisions (id, name, department, description, sort_order) values
  ('fp-frontline',   'FP | Frontline Policing',                'MET POLICE', 'Frontline operational policing and response.', 1),
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
on conflict (id) do nothing;
