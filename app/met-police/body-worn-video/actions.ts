'use server';

import { supabaseAdmin } from '@/lib/portal';
import { BODYCAM_BUCKET } from '@/lib/bodycam';
import { canManageMet, getOfficer } from '@/lib/met-access';

/** Short-lived signed links for one clip. Officers can open their own footage; command can open anyone's. */
export async function getClipPlayback(id: string): Promise<{ ok: boolean; message?: string; segments?: { url: string; ms: number }[] }> {
  const u = await getOfficer();
  if (!u) return { ok: false, message: 'Not allowed.' };

  const { data } = await supabaseAdmin.from('bodycam_incidents').select('segments, status, officer_discord_id').eq('id', id).maybeSingle();
  const segs = ((data?.segments ?? []) as { path: string; ms: number }[]) || [];
  if (!data || data.status !== 'ready' || segs.length === 0) return { ok: false, message: 'This clip is not available.' };
  if (!canManageMet(u) && data.officer_discord_id !== u.id) return { ok: false, message: 'You can only watch your own footage.' };

  const { data: signed, error } = await supabaseAdmin.storage.from(BODYCAM_BUCKET).createSignedUrls(
    segs.map((s) => s.path),
    3600
  );
  if (error || !signed) return { ok: false, message: 'Could not open the footage.' };

  const urlByPath = new Map(signed.map((s) => [s.path, s.signedUrl]));
  const out = segs.flatMap((s) => {
    const url = urlByPath.get(s.path);
    return url ? [{ url, ms: s.ms }] : [];
  });
  return { ok: out.length > 0, segments: out, message: out.length ? undefined : 'Footage files are missing.' };
}

/** Evidence is never deleted by the officer who made it: command only. */
export async function deleteClip(id: string): Promise<{ ok: boolean; message: string }> {
  const u = await getOfficer();
  if (!u || !canManageMet(u)) return { ok: false, message: 'Command only.' };

  const { data } = await supabaseAdmin.from('bodycam_incidents').select('segments').eq('id', id).maybeSingle();
  const paths = ((data?.segments ?? []) as { path: string }[]).map((s) => s.path);
  if (paths.length) await supabaseAdmin.storage.from(BODYCAM_BUCKET).remove(paths);
  await supabaseAdmin.from('bodycam_incidents').delete().eq('id', id);
  return { ok: true, message: 'Footage deleted.' };
}
