'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/portal';
import { canManageMet, getOfficer } from '@/lib/met-access';

const refresh = () => {
  revalidatePath('/met-police/communications');
  revalidatePath('/met-police/announcements');
  revalidatePath('/command/announcements');
};

export async function postAnnouncement(formData: FormData) {
  const u = await getOfficer();
  if (!u || !canManageMet(u)) return;

  const title = String(formData.get('title') || '').trim().slice(0, 120);
  const body = String(formData.get('body') || '').trim().slice(0, 4000);
  const kind = formData.get('kind') === 'bulletin' ? 'bulletin' : 'notice';
  if (!title || !body) return;

  await supabaseAdmin.from('met_announcements').insert({ title, body, kind, author: u.name, pinned: formData.get('pinned') === 'on' });
  refresh();
}

export async function deleteAnnouncement(formData: FormData) {
  const u = await getOfficer();
  if (!u || !canManageMet(u)) return;

  const id = String(formData.get('id') || '');
  if (!id) return;
  await supabaseAdmin.from('met_announcements').delete().eq('id', id);
  refresh();
}
