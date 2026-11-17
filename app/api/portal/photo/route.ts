import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/portal';
import { currentDiscordId } from '@/lib/photo-auth';

export const dynamic = 'force-dynamic';

const JPEG = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;

// Logged-in officer: read or replace their own photo.
export async function GET(req: NextRequest) {
  const id = await currentDiscordId(req);
  if (!id) return NextResponse.json({ ok: false, error: 'not logged in' }, { status: 401 });
  const { data } = await supabaseAdmin.from('met_officer_photos').select('photo, source').eq('discord_id', id).maybeSingle();
  return NextResponse.json({ ok: true, photo: data?.photo ?? null, source: data?.source ?? null });
}

export async function POST(req: NextRequest) {
  const id = await currentDiscordId(req);
  if (!id) return NextResponse.json({ ok: false, error: 'not logged in' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const image = String(body?.image ?? '');
  if (image.length > 100_000 || !JPEG.test(image)) return NextResponse.json({ ok: false, error: 'bad image' }, { status: 400 });
  const { error } = await supabaseAdmin
    .from('met_officer_photos')
    .upsert({ discord_id: id, photo: image, source: 'upload', updated_at: new Date().toISOString() }, { onConflict: 'discord_id' });
  if (error) return NextResponse.json({ ok: false, error: 'database error' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
