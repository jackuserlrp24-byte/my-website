import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/portal';
import { CORS_HEADERS, MAX_SEGMENTS, segmentPath, verifyUploadToken } from '@/lib/bodycam';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: CORS_HEADERS });

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// Called once after every segment is up: marks the clip ready for Command to watch.
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const incident = String(b?.incident ?? '');
  const durations: number[] = Array.isArray(b?.durations) ? b.durations.map((n: unknown) => Math.max(0, Math.min(Number(n) || 0, 120_000))) : [];

  if (!/^[0-9a-f-]{36}$/i.test(incident) || durations.length === 0 || durations.length > MAX_SEGMENTS) return json({ error: 'bad request' }, 400);
  if (!verifyUploadToken(req, incident)) return json({ error: 'unauthorised' }, 401);

  const segments = durations.map((ms, i) => ({ path: segmentPath(incident, i), ms }));
  const { error } = await supabaseAdmin
    .from('bodycam_incidents')
    .update({ segments, total_ms: durations.reduce((a, c) => a + c, 0), status: 'ready' })
    .eq('id', incident)
    .eq('status', 'uploading');

  if (error) return json({ error: 'update failed' }, 500);
  return json({ ok: true });
}
