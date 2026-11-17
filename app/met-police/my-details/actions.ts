'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/portal';
import { canManageMet, getOfficer } from '@/lib/met-access';
import { field } from '@/lib/met-util';

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
