'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/portal';
import { canViewFirearms, getOfficer } from '@/lib/met-access';
import { PIP_STATUS, PIP_STEPS } from '@/lib/met-pip';
import { field, makeRef } from '@/lib/met-util';

async function guard() {
  const u = await getOfficer();
  return u && canViewFirearms(u) ? u : null;
}
const refresh = () => revalidatePath('/command/firearms');

export async function logPip(fd: FormData) {
  const u = await guard();
  if (!u) return;

  const date = field(fd, 'date', 10);
  const location = field(fd, 'location', 160);
  const officers = field(fd, 'officers', 300);
  const summary = field(fd, 'summary', 3000);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !location || !officers || !summary) return;

  const rounds = Math.max(0, Math.min(999, parseInt(field(fd, 'rounds', 4), 10) || 0));
  await supabaseAdmin.from('met_firearms_pip').insert({
    reference: makeRef('PIP'),
    incident_date: date,
    incident_ref: field(fd, 'incident_ref', 40) || null,
    location,
    officers,
    discharged: fd.get('discharged') === 'on',
    rounds_fired: rounds,
    injuries: field(fd, 'injuries', 300) || null,
    summary,
    created_by_id: u.id,
    created_by_name: u.name,
  });
  refresh();
}

export async function updatePip(fd: FormData) {
  const u = await guard();
  if (!u) return;
  const id = field(fd, 'id', 60);
  const status = field(fd, 'status', 20);
  if (!id || !(PIP_STATUS as readonly string[]).includes(status)) return;

  const checklist: Record<string, boolean> = {};
  for (const s of PIP_STEPS) checklist[s.key] = fd.get(s.key) === 'on';
  await supabaseAdmin.from('met_firearms_pip').update({ status, checklist, review_notes: field(fd, 'review_notes', 1500) || null, reviewed_by: u.name }).eq('id', id);
  refresh();
}

export async function deletePip(fd: FormData) {
  const u = await guard();
  if (!u) return;
  const id = field(fd, 'id', 60);
  if (!id) return;
  await supabaseAdmin.from('met_firearms_pip').delete().eq('id', id);
  refresh();
}
