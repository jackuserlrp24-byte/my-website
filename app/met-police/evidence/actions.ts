'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/portal';
import { canManageMet, getOfficer } from '@/lib/met-access';
import { field, makeRef } from '@/lib/met-util';
import { EVIDENCE_BUCKET } from '@/lib/met-evidence';

const MAX_BYTES = 4 * 1024 * 1024; // Vercel functions accept about 4.5 MB per request
const ALLOWED = /^(image\/(png|jpe?g|gif|webp)|application\/pdf|text\/plain|audio\/(mpeg|mp3|wav|ogg|webm)|video\/(mp4|webm))$/;

const safeName = (n: string) => n.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80) || 'file';

export async function uploadEvidence(fd: FormData) {
  const u = await getOfficer();
  if (!u) return;

  const file = fd.get('file');
  const description = field(fd, 'description', 300);
  if (!(file instanceof File) || file.size === 0 || !description) return;
  if (file.size > MAX_BYTES || !ALLOWED.test(file.type)) return;

  const ref = makeRef('EX');
  const path = `${u.id}/${ref}-${safeName(file.name)}`;
  const { error: upErr } = await supabaseAdmin.storage.from(EVIDENCE_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) {
    console.error('Evidence upload failed:', upErr);
    return;
  }

  const { error } = await supabaseAdmin.from('met_evidence').insert({
    exhibit_ref: ref,
    description,
    incident_ref: field(fd, 'incident_ref', 20) || null,
    file_path: path,
    file_name: file.name.slice(0, 120),
    mime: file.type,
    size_bytes: file.size,
    uploaded_by_id: u.id,
    uploaded_by_name: u.name,
  });
  if (error) {
    console.error('Evidence insert failed:', error);
    await supabaseAdmin.storage.from(EVIDENCE_BUCKET).remove([path]); // don't leave an orphan file behind
  }
  revalidatePath('/met-police/evidence');
}

/** Evidence is never deleted by the officer who made it: command only. */
export async function deleteEvidence(fd: FormData) {
  const u = await getOfficer();
  if (!u || !canManageMet(u)) return;
  const id = field(fd, 'id', 60);
  if (!id) return;
  const { data } = await supabaseAdmin.from('met_evidence').select('file_path').eq('id', id).maybeSingle();
  if (data?.file_path) await supabaseAdmin.storage.from(EVIDENCE_BUCKET).remove([data.file_path]);
  await supabaseAdmin.from('met_evidence').delete().eq('id', id);
  revalidatePath('/met-police/evidence');
}
