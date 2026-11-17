'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/portal';
import { getOfficer } from '@/lib/met-access';
import { getOfficerOptions, nameFor } from '@/lib/met-officers';
import { field } from '@/lib/met-util';

export async function sendMessage(fd: FormData) {
  const u = await getOfficer();
  if (!u) return;

  const toId = field(fd, 'to', 30);
  const subject = field(fd, 'subject', 120);
  const body = field(fd, 'body', 3000);
  if (!toId || !subject || !body || toId === u.id) return;

  const toName = nameFor(await getOfficerOptions(), toId);
  if (!toName) return; // only whitelisted officers can be messaged

  await supabaseAdmin.from('met_messages').insert({ from_id: u.id, from_name: u.name, to_id: toId, to_name: toName, subject, body });
  revalidatePath('/met-police/communications');
}

export async function markRead(fd: FormData) {
  const u = await getOfficer();
  if (!u) return;
  const id = field(fd, 'id', 60);
  if (!id) return;
  await supabaseAdmin.from('met_messages').update({ read_at: new Date().toISOString() }).eq('id', id).eq('to_id', u.id).is('read_at', null);
  revalidatePath('/met-police/communications');
}
