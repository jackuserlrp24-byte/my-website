import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getSchedule, runScheduleEffects } from '@/lib/maintenance-schedule';
import { getGuildMember } from '@/lib/discord';
import { FIVEM_MAINTENANCE_BYPASS_ROLE_IDS, SCHEDULE_FIVEM_MESSAGE, schedulePhase } from '@/lib/maintenance-config';

export const dynamic = 'force-dynamic';

// The CO-PortalSync FiveM resource uses this.
//   POST { discordIds: string[] } -> { active, message, allowed: string[] }
//     active  = FiveM maintenance is on right now
//     allowed = the ids that hold one of the bypass roles (they may stay / join)
// Auth: "Authorization: Bearer <FIVEM_MOD_SECRET>" (stays closed if it is not set).

function authorised(req: Request): boolean {
  const secret = process.env.FIVEM_MOD_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(req: Request) {
  if (!process.env.FIVEM_MOD_SECRET) return NextResponse.json({ error: 'FIVEM_MOD_SECRET is not set.' }, { status: 503 });
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await runScheduleEffects();
  const s = await getSchedule();
  const active = !!s && s.fivem && schedulePhase(s) === 'active';
  const headers = { 'Cache-Control': 'no-store' };
  if (!s || !active) return NextResponse.json({ active: false, message: '', allowed: [] }, { headers });

  let ids: string[] = [];
  try {
    const body = (await req.json()) as { discordIds?: unknown };
    ids = Array.isArray(body.discordIds) ? body.discordIds.map(String).filter((x) => /^\d{15,25}$/.test(x)).slice(0, 100) : [];
  } catch {}

  // Fails closed: if Discord can't be reached for someone, they are treated as not allowed.
  const allowed = (
    await Promise.all(
      ids.map(async (id) => {
        const m = await getGuildMember(id);
        return m && m.roles.some((r) => FIVEM_MAINTENANCE_BYPASS_ROLE_IDS.includes(r)) ? id : null;
      })
    )
  ).filter((x): x is string => !!x);

  const back = s.end_at ? `\nExpected back: ${new Date(s.end_at).toLocaleString('en-GB', { timeZone: 'Europe/London', weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} (UK time)` : '';
  const message = `${s.message.trim() || SCHEDULE_FIVEM_MESSAGE}${back}`;
  return NextResponse.json({ active: true, message, allowed }, { headers });
}
