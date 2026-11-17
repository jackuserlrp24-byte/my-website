-- Officer profiles: officers create their own profile (officer name + warrant card) from My Details.
-- Run once in the Supabase SQL editor.
alter table met_officer_details add column if not exists officer_name text;
alter table met_officer_details add column if not exists warrant_card text;
create unique index if not exists met_officer_warrant_card_uq on met_officer_details (upper(warrant_card)) where warrant_card is not null;
