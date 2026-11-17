-- Optional tidy-up. Run once in the Supabase SQL editor.
-- Your met-profile.sql already created the unique index (met_officer_warrant_card_uq), so duplicates are already blocked.
-- This only turns empty-string warrant numbers into null, so they can't clash with each other.
update met_officer_details set warrant_card = null where warrant_card = '';
