import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getAop, saveAop } from '@/lib/aop';

export const dynamic = 'force-dynamic';

// The CO-HudScript FiveM resource uses this so the AOP is the same in game and on the staff panel.
//   GET  -> { aop, by, stamp }   (aop is null until one has been set)
//   POST -> { aop, by }          saves an AOP that was changed in game, returns { success, stamp }
// Auth: "Authorization: Bearer <FIVEM_MOD_SECRET>" (stays closed if it is not set).

function authorised(req: Request): boolean {
  const secret = process.env.FIVEM_MOD_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

const headers = { 'Cache-Control': 'no-store' };

export async function GET(req: Request) {
  if (!process.env.FIVEM_MOD_SECRET) return NextResponse.json({ error: 'FIVEM_MOD_SECRET is not set.' }, { status: 503 });
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const s = await getAop();
  return NextResponse.json({ aop: s?.aop ?? null, by: s?.by ?? null, stamp: s?.stamp ?? null }, { headers });
}

export async function POST(req: Request) {
  if (!process.env.FIVEM_MOD_SECRET) return NextResponse.json({ error: 'FIVEM_MOD_SECRET is not set.' }, { status: 503 });
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { aop?: unknown; by?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  const aop = typeof body.aop === 'string' ? body.aop.trim().slice(0, 200).toUpperCase() : '';
  const by = typeof body.by === 'string' ? body.by.trim().slice(0, 80) : 'In game';
  if (!aop) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  const stamp = await saveAop(aop, `${by} (in game)`);
  if (!stamp) return NextResponse.json({ error: 'Could not save' }, { status: 500 });
  return NextResponse.json({ success: true, stamp }, { headers });
}
