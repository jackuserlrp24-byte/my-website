import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/portal';

export const BODYCAM_BUCKET = 'bodycam';
export const MAX_SEGMENT_BYTES = 4_000_000; // stays under the serverless request body limit
export const MAX_SEGMENTS = 40;
const RETENTION_DAYS = Number(process.env.BODYCAM_RETENTION_DAYS || 14);

/** The FiveM game server may be called from a NUI page (origin nui://...), so the upload routes allow any origin; auth is the signed token. */
export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};

const secret = () => process.env.BODYCAM_API_SECRET || '';
const hmac = (payload: string) => crypto.createHmac('sha256', secret()).update(payload).digest('hex');

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Server-to-server check: the FiveM server sends the shared secret. */
export function serverAuthorised(req: Request) {
  const s = secret();
  const given = req.headers.get('x-bodycam-secret') || '';
  return !!s && safeEqual(given, s);
}

/** Short-lived upload token for ONE incident (given to the officer's NUI). */
export function signUploadToken(incidentId: string, ttlMs = 15 * 60_000) {
  const payload = `${incidentId}.${Date.now() + ttlMs}`;
  return `${payload}.${hmac(payload)}`;
}

export function verifyUploadToken(req: Request, incidentId: string) {
  if (!secret()) return false;
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const [id, exp, sig] = token.split('.');
  if (!id || !exp || !sig || id !== incidentId) return false;
  if (!safeEqual(sig, hmac(`${id}.${exp}`))) return false;
  return Number(exp) > Date.now();
}

export const segmentPath = (incidentId: string, seq: number) => `${incidentId}/${String(seq).padStart(3, '0')}.webm`;

export const clip = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

/** Deletes footage older than the retention period (default 14 days). A few at a time, never throws. */
export async function purgeOldBodycam() {
  try {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400_000).toISOString();
    const { data } = await supabaseAdmin.from('bodycam_incidents').select('id, segments').lt('created_at', cutoff).limit(10);
    for (const row of data ?? []) {
      const paths = ((row.segments ?? []) as { path: string }[]).map((s) => s.path);
      if (paths.length) await supabaseAdmin.storage.from(BODYCAM_BUCKET).remove(paths);
      await supabaseAdmin.from('bodycam_incidents').delete().eq('id', row.id);
    }
  } catch (err) {
    console.error('Bodycam purge failed:', err);
  }
}
