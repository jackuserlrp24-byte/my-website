import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/portal';
import { clip, serverAuthorised, signUploadToken } from '@/lib/bodycam';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Called by the FiveM SERVER when an officer hits a player. Creates the incident and hands back an upload token.
export async function POST(req: Request) {
  if (!serverAuthorised(req)) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const b = await req.json().catch(() => null);
  if (!b || typeof b !== 'object') return NextResponse.json({ error: 'bad body' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('bodycam_incidents')
    .insert({
      officer_name: clip(b.officerName, 80),
      officer_discord_id: clip(b.officerDiscord, 30),
      target_name: clip(b.targetName, 80),
      target_discord_id: clip(b.targetDiscord, 30),
      weapon: clip(b.weapon, 40),
      serial: clip(b.serial, 20),
      coords: clip(b.coords, 60),
      trigger: ['hit', 'firearm', 'taser'].includes(b.trigger) ? b.trigger : 'hit',
      status: 'uploading',
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('Bodycam incident insert failed:', error);
    return NextResponse.json({ error: 'insert failed (run supabase/bodycam.sql)' }, { status: 500 });
  }
  return NextResponse.json({ id: data.id, token: signUploadToken(data.id) });
}
