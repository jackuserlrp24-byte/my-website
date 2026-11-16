'use server';

import { getPortalUser, supabaseAdmin } from '@/lib/portal';
import { hasCommandAccess } from '@/lib/training-config';
import { BODYCAM_BUCKET } from '@/lib/bodycam';

async function allowed() {
  const user = await getPortalUser();
  return user && (hasCommandAccess(user.roles) || user.isManagement) ? user : null;
}

/** Short-lived signed links for one clip's segments (only for Command). */
export async function getBodycamPlayback(id: string): Promise<{ ok: boolean; message?: string; segments?: { url: string; ms: number }[] }> {
  if (!(await allowed())) return { ok: false, message: 'Command only.' };

  const { data } = await supabaseAdmin.from('bodycam_incidents').select('segments, status').eq('id', id).maybeSingle();
  const segs = ((data?.segments ?? []) as { path: string; ms: number }[]) || [];
  if (!data || data.status !== 'ready' || segs.length === 0) return { ok: false, message: 'This clip is not available.' };

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

export async function deleteBodycam(id: string): Promise<{ ok: boolean; message: string }> {
  if (!(await allowed())) return { ok: false, message: 'Command only.' };

  const { data } = await supabaseAdmin.from('bodycam_incidents').select('segments').eq('id', id).maybeSingle();
  const paths = ((data?.segments ?? []) as { path: string }[]).map((s) => s.path);
  if (paths.length) await supabaseAdmin.storage.from(BODYCAM_BUCKET).remove(paths);
  await supabaseAdmin.from('bodycam_incidents').delete().eq('id', id);
  return { ok: true, message: 'Footage deleted.' };
}
