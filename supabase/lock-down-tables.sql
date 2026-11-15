-- Lock the database so ONLY the website (server-side, service-role key) can read or write these tables.
--
-- Why: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are public by design (they ship to every
-- browser). With row level security (RLS) OFF, anyone could use them to read a table directly and bypass
-- every staff check on the website. With RLS ON and no policies, the anon key can do nothing, while the
-- website keeps working because the service-role key bypasses RLS. Nothing in the site uses the anon key
-- in the browser, so this is safe to run.
--
-- Run it once in Supabase -> SQL Editor. It is idempotent (safe to re-run) and skips tables that don't exist.

alter table if exists portal_settings          enable row level security;
alter table if exists divisions                enable row level security;
alter table if exists division_applications    enable row level security;
alter table if exists trainings                enable row level security;
alter table if exists role_requests            enable row level security;
alter table if exists moderation_logs          enable row level security;
alter table if exists game_actions             enable row level security;
alter table if exists ban_appeals              enable row level security;
alter table if exists staff_requests           enable row level security;
alter table if exists loa_requests             enable row level security;

-- These are used by the code but were never given RLS in any of the setup scripts:
alter table if exists user_whitelists          enable row level security;
alter table if exists patrols                  enable row level security;
alter table if exists community_notices        enable row level security;
alter table if exists met_training_records     enable row level security;
alter table if exists met_role_requests        enable row level security;

-- Check the result: every row should say rowsecurity = true.
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by rowsecurity, tablename;
