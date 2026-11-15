import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { supabaseAdmin } from '@/lib/portal';

export const dynamic = 'force-dynamic';

// Called by the CO-StaffRequest FiveM resource.
//   { event: 'new',      ref, gameId, playerName, discordId, reason }
//   { event: 'accepted' | 'denied', ref, handledBy }
// Auth: "Authorization: Bearer <FIVEM_MOD_SECRET>" (closed if it is not set).

function authorised(req: Request): boolean {
  const secret = process.env.FIVEM_MOD_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

const clean = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

export async function POST(req: Request) {
  if (!process.env.FIVEM_MOD_SECRET) return NextResponse.json({ error: 'FIVEM_MOD_SECRET is not set.' }, { status: 503 });
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const event = clean(body.event, 10);
  const ref = clean(body.ref, 80);
  if (!ref) return NextResponse.json({ error: 'Missing ref' }, { status: 400 });

  if (event === 'new') {
    const discordId = clean(body.discordId, 25);
    const { error } = await supabaseAdmin.from('staff_requests').upsert(
      {
        external_ref: ref,
        game_id: Number(body.gameId) || null,
        player_name: clean(body.playerName, 80) || 'Unknown',
        discord_id: /^\d{17,20}$/.test(discordId) ? discordId : null,
        reason: clean(body.reason, 500) || 'No reason given',
      },
      { onConflict: 'external_ref' }
    );
    if (error) {
      console.error('staff_requests insert failed:', error);
      return NextResponse.json({ error: 'Could not save (is the staff_requests table created? Run full-setup.sql).' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (event === 'accepted' || event === 'denied') {
    const { error } = await supabaseAdmin
      .from('staff_requests')
      .update({ status: event, handled_by: clean(body.handledBy, 80) || 'Staff', handled_at: new Date().toISOString() })
      .eq('external_ref', ref)
      .eq('status', 'open');
    if (error) console.error('staff_requests update failed:', error);
    return NextResponse.json({ ok: !error });
  }

  return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
}
