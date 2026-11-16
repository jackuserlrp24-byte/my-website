import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/portal';
import { BODYCAM_BUCKET, CORS_HEADERS, MAX_SEGMENTS, MAX_SEGMENT_BYTES, segmentPath, verifyUploadToken } from '@/lib/bodycam';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: CORS_HEADERS });

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// Called by the officer's game client (NUI): one 10 second .webm segment per request.
export async function POST(req: Request) {
  const url = new URL(req.url);
  const incident = url.searchParams.get('incident') || '';
  const seq = Number(url.searchParams.get('seq'));

  if (!/^[0-9a-f-]{36}$/i.test(incident) || !Number.isInteger(seq) || seq < 0 || seq >= MAX_SEGMENTS) return json({ error: 'bad request' }, 400);
  if (!verifyUploadToken(req, incident)) return json({ error: 'unauthorised' }, 401);

  const { data: row } = await supabaseAdmin.from('bodycam_incidents').select('id, status').eq('id', incident).maybeSingle();
  if (!row || row.status !== 'uploading') return json({ error: 'unknown or closed incident' }, 404);

  const body = new Uint8Array(await req.arrayBuffer());
  if (body.byteLength === 0 || body.byteLength > MAX_SEGMENT_BYTES) return json({ error: 'bad size' }, 413);

  const { error } = await supabaseAdmin.storage.from(BODYCAM_BUCKET).upload(segmentPath(incident, seq), body, {
    contentType: 'video/webm',
    upsert: true,
  });
  if (error) {
    console.error('Bodycam upload failed:', error);
    return json({ error: 'storage failed (is the "bodycam" bucket created?)' }, 500);
  }
  return json({ ok: true });
}
