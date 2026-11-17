'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/portal';
import { canViewAcat, getOfficer } from '@/lib/met-access';
import { ACAT_STATUS, acatCategory } from '@/lib/met-acat';
import { field, makeRef } from '@/lib/met-util';

// Every action re-checks the role on the server, so nobody else can use them even by calling them directly.
async function guard() {
  const u = await getOfficer();
  return u && canViewAcat(u) ? u : null;
}

export async function addEntry(fd: FormData) {
  const u = await guard();
  if (!u) return;
  const category = field(fd, 'category', 30);
  const title = field(fd, 'title', 160);
  const details = field(fd, 'details', 4000);
  if (!acatCategory(category) || !title || !details) return;

  await supabaseAdmin.from('met_acat_entries').insert({
    category,
    reference: makeRef('ACAT'),
    title,
    details,
    created_by_id: u.id,
    created_by_name: u.name,
  });
  revalidatePath(`/command/acat/${category}`);
}

export async function setStatus(fd: FormData) {
  const u = await guard();
  if (!u) return;
  const id = field(fd, 'id', 60);
  const category = field(fd, 'category', 30);
  const status = field(fd, 'status', 20);
  if (!id || !(ACAT_STATUS as readonly string[]).includes(status)) return;
  await supabaseAdmin.from('met_acat_entries').update({ status }).eq('id', id);
  revalidatePath(`/command/acat/${category}`);
}

export async function deleteEntry(fd: FormData) {
  const u = await guard();
  if (!u) return;
  const id = field(fd, 'id', 60);
  const category = field(fd, 'category', 30);
  if (!id) return;
  await supabaseAdmin.from('met_acat_entries').delete().eq('id', id);
  revalidatePath(`/command/acat/${category}`);
}
