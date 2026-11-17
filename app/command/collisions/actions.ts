'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/portal';
import { canViewCollisions, getOfficer } from '@/lib/met-access';
import { getOfficerOptions, nameFor } from '@/lib/met-officers';
import { COLLISION_SEVERITY, COLLISION_STATUS } from '@/lib/met-pip';
import { field, makeRef } from '@/lib/met-util';

async function guard() {
  const u = await getOfficer();
  return u && canViewCollisions(u) ? u : null;
}
const refresh = () => revalidatePath('/command/collisions');

export async function logCollision(fd: FormData) {
  const u = await guard();
  if (!u) return;

  const date = field(fd, 'date', 10);
  const officerId = field(fd, 'officer', 30);
  const location = field(fd, 'location', 160);
  const description = field(fd, 'description', 3000);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !officerId || !location || !description) return;

  const officerName = nameFor(await getOfficerOptions(), officerId);
  if (!officerName) return;

  const severity = field(fd, 'severity', 20);
  await supabaseAdmin.from('met_collisions').insert({
    reference: makeRef('COL'),
    collision_date: date,
    officer_id: officerId,
    officer_name: officerName,
    vehicle: field(fd, 'vehicle', 60) || null,
    location,
    severity: (COLLISION_SEVERITY as readonly string[]).includes(severity) ? severity : 'minor',
    injuries: fd.get('injuries') === 'on',
    response_driving: fd.get('response_driving') === 'on',
    description,
    created_by_id: u.id,
    created_by_name: u.name,
  });
  refresh();
}

export async function updateCollision(fd: FormData) {
  const u = await guard();
  if (!u) return;
  const id = field(fd, 'id', 60);
  const status = field(fd, 'status', 20);
  if (!id || !(COLLISION_STATUS as readonly string[]).includes(status)) return;
  await supabaseAdmin.from('met_collisions').update({ status, review_notes: field(fd, 'review_notes', 1500) || null, reviewed_by: u.name }).eq('id', id);
  refresh();
}

export async function deleteCollision(fd: FormData) {
  const u = await guard();
  if (!u) return;
  const id = field(fd, 'id', 60);
  if (!id) return;
  await supabaseAdmin.from('met_collisions').delete().eq('id', id);
  refresh();
}
