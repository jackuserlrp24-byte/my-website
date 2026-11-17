'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/portal';
import { canManageMet, getOfficer } from '@/lib/met-access';
import { field } from '@/lib/met-util';
import { normaliseReg, searchPersons, searchVehicles } from '@/lib/met-checks';

/** Runs a simulated check, logs who ran it, then shows the result on the page. */
export async function runCheck(fd: FormData) {
  const u = await getOfficer();
  if (!u) return;

  const kind = field(fd, 'kind', 10) === 'vehicle' ? 'vehicle' : 'person';
  const q = field(fd, 'q', 80);
  if (!q) return;

  const hits = kind === 'vehicle' ? await searchVehicles(q) : await searchPersons(q);
  await supabaseAdmin.from('met_check_log').insert({
    kind,
    query: kind === 'vehicle' ? normaliseReg(q) : q,
    found: hits.length > 0,
    officer_id: u.id,
    officer_name: u.name,
  });

  redirect(`/met-police/checks?kind=${kind}&q=${encodeURIComponent(q)}`);
}

export async function addPerson(fd: FormData) {
  const u = await getOfficer();
  if (!u || !canManageMet(u)) return;
  const full_name = field(fd, 'full_name', 120);
  if (!full_name) return;
  await supabaseAdmin.from('met_pnc_persons').insert({
    full_name,
    dob: field(fd, 'dob', 30) || null,
    address: field(fd, 'address', 200) || null,
    markers: field(fd, 'markers', 200) || null,
    notes: field(fd, 'notes', 1000) || null,
    created_by_name: u.name,
  });
  revalidatePath('/met-police/checks');
}

export async function addVehicle(fd: FormData) {
  const u = await getOfficer();
  if (!u || !canManageMet(u)) return;
  const registration = normaliseReg(field(fd, 'registration', 20));
  if (!registration) return;
  await supabaseAdmin.from('met_pnc_vehicles').insert({
    registration,
    make_model: field(fd, 'make_model', 100) || null,
    colour: field(fd, 'colour', 40) || null,
    keeper: field(fd, 'keeper', 120) || null,
    status: field(fd, 'status', 120) || null,
    markers: field(fd, 'markers', 200) || null,
    notes: field(fd, 'notes', 1000) || null,
    created_by_name: u.name,
  });
  revalidatePath('/met-police/checks');
}

export async function deleteRecord(fd: FormData) {
  const u = await getOfficer();
  if (!u || !canManageMet(u)) return;
  const id = field(fd, 'id', 60);
  const table = field(fd, 'table', 10) === 'vehicle' ? 'met_pnc_vehicles' : 'met_pnc_persons';
  if (!id) return;
  await supabaseAdmin.from(table).delete().eq('id', id);
  revalidatePath('/met-police/checks');
}
