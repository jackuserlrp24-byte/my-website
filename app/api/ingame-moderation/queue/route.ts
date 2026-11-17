import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { supabaseAdmin } from '@/lib/portal';

export const dynamic = 'force-dynamic';

// The CO-StaffMenu FiveM resource polls this every few seconds.
//   GET  -> claims pending warn/kick/ban/unban actions queued from the portal and returns them
//   POST -> { id, status: 'done' | 'failed', result } reports what happened in game
// Auth: "Authorization: Bearer <FIVEM_MOD_SECRET>" (the route stays closed if it is not set).

function authorised(req: Request): boolean {
  const secret = process.env.FIVEM_MOD_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Warn / kick / ban / unban are collected by CO-StaffMenu (default). The server-wide clean-ups (mass DV, delete NPCs)
// are collected by CO-StaffEssentials with ?scope=world, so the two resources never take each other's actions.
const MOD_ACTIONS = ['warn', 'kick', 'ban', 'unban'];
const WORLD_ACTIONS = ['massdv', 'delnpcs', 'delnpcvehicles'];

const COLUMNS = 'id, action, target_discord_id, target_name, reason, duration_hours, requested_by';

export async function GET(req: Request) {
  if (!process.env.FIVEM_MOD_SECRET) return NextResponse.json({ error: 'FIVEM_MOD_SECRET is not set.' }, { status: 503 });
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = Date.now();
  const world = new URL(req.url).searchParams.get('scope') === 'world';
  const kinds = world ? WORLD_ACTIONS : MOD_ACTIONS;

  // Warns and kicks that nobody collected within 10 minutes are dropped so they don't fire hours later.
  await supabaseAdmin
    .from('game_actions')
    .update({ status: 'expired', result: 'Server did not collect this in time.', completed_at: new Date().toISOString() })
    .eq('status', 'pending')
    .in('action', world ? WORLD_ACTIONS : ['warn', 'kick'])
    .lt('created_at', new Date(now - 10 * 60 * 1000).toISOString());

  const { data: pending } = await supabaseAdmin
    .from('game_actions')
    .select('id')
    .eq('status', 'pending')
    .in('action', kinds)
    .order('created_at', { ascending: true })
    .limit(20);

  const ids = (pending ?? []).map((r) => r.id as string);
  let claimed: unknown[] = [];
  if (ids.length) {
    // The status guard makes the claim atomic: two pollers can never both get the same action.
    const { data } = await supabaseAdmin
      .from('game_actions')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .in('id', ids)
      .eq('status', 'pending')
      .select(COLUMNS);
    claimed = data ?? [];
  }

  // Anything handed out but never acknowledged (server crashed mid-way) is offered again after 2 minutes.
  const { data: stale } = await supabaseAdmin
    .from('game_actions')
    .update({ sent_at: new Date().toISOString() })
    .eq('status', 'sent')
    .in('action', kinds)
    .lt('sent_at', new Date(now - 2 * 60 * 1000).toISOString())
    .select(COLUMNS);

  return NextResponse.json({ actions: [...claimed, ...(stale ?? [])] });
}

export async function POST(req: Request) {
  if (!process.env.FIVEM_MOD_SECRET) return NextResponse.json({ error: 'FIVEM_MOD_SECRET is not set.' }, { status: 503 });
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { id?: unknown; status?: unknown; result?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const id = String(body.id ?? '');
  const status = body.status === 'done' ? 'done' : body.status === 'failed' ? 'failed' : null;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !status) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('game_actions')
    .update({ status, result: String(body.result ?? '').slice(0, 300), completed_at: new Date().toISOString() })
    .eq('id', id)
    .in('status', ['sent', 'pending']);
  if (error) return NextResponse.json({ error: 'Could not save' }, { status: 500 });

  return NextResponse.json({ success: true });
}
