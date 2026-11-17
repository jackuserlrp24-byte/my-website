'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/portal';
import { canManageMet, getOfficer } from '@/lib/met-access';
import { field } from '@/lib/met-util';
import { stationFor } from '@/lib/met-station';

/** Rank, station and team are set by command. Officers can see their own but not change them. */
export async function saveOfficerDetails(fd: FormData) {
  const u = await getOfficer();
  if (!u || !canManageMet(u)) return;

  const discordId = field(fd, 'discord_id', 30);
  if (!/^\d{15,25}$/.test(discordId)) return;

  await supabaseAdmin.from('met_officer_details').upsert({
    discord_id: discordId,
    rank: field(fd, 'rank', 60) || null,
    station: field(fd, 'station', 80) || null,
    team: field(fd, 'team', 80) || null,
    updated_by: u.name,
    updated_at: new Date().toISOString(),
  });
  revalidatePath('/met-police/my-details');
}

const BACK = '/met-police/my-details';
const fail = (msg: string): never => redirect(`${BACK}?err=${encodeURIComponent(msg)}`);

/** Any officer creates (or updates) their OWN profile: officer name + warrant card number. Their station is assigned automatically. */
export async function saveMyProfile(fd: FormData) {
  const u = await getOfficer();
  if (!u) return;

  const name = field(fd, 'officer_name', 60).replace(/\s+/g, ' ');
  const card = field(fd, 'warrant_card', 12).toUpperCase();
  if (name.length < 3) fail('Enter your officer name.');
  if (!/^[A-Z0-9-]{1,12}$/.test(card)) fail('Warrant card number can only use letters, numbers and dashes (up to 12).');

  const { data: taken } = await supabaseAdmin.from('met_officer_details').select('discord_id').ilike('warrant_card', card).neq('discord_id', u.id).limit(1);
  if (taken && taken.length) fail('That warrant card number is already in use by another officer.');

  const { data: existing } = await supabaseAdmin.from('met_officer_details').select('station').eq('discord_id', u.id).maybeSingle();
  const station = await stationFor(u.roles, existing?.station ?? null);

  const { error } = await supabaseAdmin.from('met_officer_details').upsert({
    discord_id: u.id,
    officer_name: name,
    warrant_card: card,
    station,
    updated_by: u.name,
    updated_at: new Date().toISOString(),
  });
  if (error) fail('Could not save your profile. Has supabase/met-profile.sql been run?');
  revalidatePath(BACK);
  revalidatePath('/met-police/roster');
  redirect(`${BACK}?saved=1`);
}
