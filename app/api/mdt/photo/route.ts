import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { supabaseAdmin } from '@/lib/portal';

export const dynamic = 'force-dynamic';

// Called by CO-IDPhoto (server.lua). Header: x-mdt-key = MDT_API_KEY (same key as the rest of the MDT link)
function authed(req: NextRequest) {
  const key = process.env.MDT_API_KEY;
  const got = req.headers.get('x-mdt-key') ?? '';
  if (!key || got.length !== key.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(key));
}

const ID = /^\d{15,25}$/;
const JPEG = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;

// GET /api/mdt/photo?discord=<id>  ->  { ok, has }
export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ ok: false, error: 'unauthorised' }, { status: 401 });
  const id = req.nextUrl.searchParams.get('discord') ?? '';
  if (!ID.test(id)) return NextResponse.json({ ok: false, error: 'bad discord id' }, { status: 400 });
  const { data, error } = await supabaseAdmin.from('met_officer_photos').select('discord_id').eq('discord_id', id).maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: 'database error' }, { status: 500 });
  return NextResponse.json({ ok: true, has: !!data });
}

// POST /api/mdt/photo  { discord, image }  ->  { ok, saved }   (the game never overwrites an existing photo: one time only)
export async function POST(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ ok: false, error: 'unauthorised' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const id = String(body?.discord ?? '');
  const image = String(body?.image ?? '');
  if (!ID.test(id)) return NextResponse.json({ ok: false, error: 'bad discord id' }, { status: 400 });
  if (image.length > 100_000 || !JPEG.test(image)) return NextResponse.json({ ok: false, error: 'bad image' }, { status: 400 });

  const { data: existing } = await supabaseAdmin.from('met_officer_photos').select('discord_id').eq('discord_id', id).maybeSingle();
  if (existing) return NextResponse.json({ ok: true, saved: false });

  const { error } = await supabaseAdmin.from('met_officer_photos').insert({ discord_id: id, photo: image, source: 'game' });
  if (error) return NextResponse.json({ ok: false, error: 'database error' }, { status: 500 });
  return NextResponse.json({ ok: true, saved: true });
}
