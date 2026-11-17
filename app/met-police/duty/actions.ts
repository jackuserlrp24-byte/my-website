'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/portal';
import { getOfficer } from '@/lib/met-access';
import { field } from '@/lib/met-util';

export async function setAvailability(fd: FormData) {
  const u = await getOfficer();
  if (!u) return;
  const status = field(fd, 'status', 20);
  if (!['on_duty', 'off_duty', 'unavailable'].includes(status)) return;

  await supabaseAdmin.from('met_duty_status').upsert({
    discord_id: u.id,
    name: u.name,
    status,
    note: field(fd, 'note', 140) || null,
    updated_at: new Date().toISOString(),
  });
  revalidatePath('/met-police/duty');
}
