import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getGuildMember } from '@/lib/discord-member';
import { pickDisplayName } from '@/lib/ingame-name';

export const dynamic = 'force-dynamic';

// Called by the CO-DiscordNames FiveM resource while a player is connecting.
//   GET ?discordId=<id>  ->  { found: true, name: "[123] John Smith" }
// The name is their server nickname (the whitelist form sets it to "[collar] RP Name"), falling back to
// their Discord display name and then their username.
// Auth: "Authorization: Bearer <FIVEM_MOD_SECRET>" (the route stays closed if it is not set).

function authorised(req: Request): boolean {
  const secret = process.env.FIVEM_MOD_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(req: Request) {
  if (!process.env.FIVEM_MOD_SECRET) {
    return NextResponse.json({ error: 'FIVEM_MOD_SECRET is not set on the website.' }, { status: 503 });
  }
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const discordId = new URL(req.url).searchParams.get('discordId') ?? '';
  if (!/^\d{17,20}$/.test(discordId)) {
    return NextResponse.json({ error: 'Invalid discordId' }, { status: 400 });
  }

  const result = await getGuildMember(discordId);

  if (result.status === 'ok') {
    const name = pickDisplayName(result.member);
    if (name) return NextResponse.json({ found: true, name });
    return NextResponse.json({ found: false }, { status: 404 });
  }
  if (result.status === 'not_member') return NextResponse.json({ found: false }, { status: 404 });
  if (result.status === 'unconfigured') {
    return NextResponse.json({ error: 'Discord is not configured on the website.' }, { status: 503 });
  }
  return NextResponse.json({ error: 'Discord lookup failed' }, { status: 502 });
}
