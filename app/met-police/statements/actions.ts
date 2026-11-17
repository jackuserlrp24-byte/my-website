'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/portal';
import { getOfficer } from '@/lib/met-access';
import { field, makeRef } from '@/lib/met-util';

/** Saves an MG11 witness statement as a draft, or submits it. Drafts can be edited by their author until submitted. */
export async function saveStatement(fd: FormData) {
  const u = await getOfficer();
  if (!u) return;

  const witness = field(fd, 'witness_name', 120);
  const body = field(fd, 'body', 8000);
  if (!witness || !body) return;

  const submit = field(fd, 'intent', 10) === 'submit';
  const row = {
    witness_name: witness,
    witness_dob: field(fd, 'witness_dob', 30) || null,
    witness_occupation: field(fd, 'witness_occupation', 100) || null,
    witness_address: field(fd, 'witness_address', 200) || null,
    incident_ref: field(fd, 'incident_ref', 20) || null,
    body,
    status: submit ? 'submitted' : 'draft',
    submitted_at: submit ? new Date().toISOString() : null,
  };

  const id = field(fd, 'id', 60);
  if (id) {
    // Only the author can change it, and only while it is still a draft.
    await supabaseAdmin.from('met_statements').update(row).eq('id', id).eq('author_id', u.id).eq('status', 'draft');
  } else {
    await supabaseAdmin.from('met_statements').insert({ ...row, reference: makeRef('MG11'), author_id: u.id, author_name: u.name });
  }
  revalidatePath('/met-police/statements');
}

export async function deleteDraft(fd: FormData) {
  const u = await getOfficer();
  if (!u) return;
  const id = field(fd, 'id', 60);
  if (!id) return;
  await supabaseAdmin.from('met_statements').delete().eq('id', id).eq('author_id', u.id).eq('status', 'draft');
  revalidatePath('/met-police/statements');
}
