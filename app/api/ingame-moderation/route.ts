import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { supabaseAdmin } from '@/lib/portal';
import { banDmPayload, postMessage, sendDm } from '@/lib/discord';
import { moderationLogChannel } from '@/lib/training-config';

export const dynamic = 'force-dynamic';

// Called by the CO-StaffMenu FiveM resource when staff warn / kick / ban (or unban) someone in game.
// Auth: "Authorization: Bearer <FIVEM_MOD_SECRET>". If FIVEM_MOD_SECRET is not set the route stays closed.

const COLOURS: Record<string, number> = { WARN: 16705372, KICK: 15105570, BAN: 15548997, UNBAN: 5763719 };

function authorised(req: Request): boolean {
  const secret = process.env.FIVEM_MOD_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

const clean = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

export async function POST(req: Request) {
  if (!process.env.FIVEM_MOD_SECRET) {
    return NextResponse.json({ error: 'FIVEM_MOD_SECRET is not set on the website.' }, { status: 503 });
  }
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const action = clean(body.action, 10).toUpperCase();
  const discordId = clean(body.discordId, 25);
  const username = clean(body.username, 80) || 'Unknown';
  const reason = clean(body.reason, 500) || 'No reason given';
  const moderator = clean(body.moderator, 80) || '[In-game] Staff';
  const detail = clean(body.detail, 60);

  if (!['WARN', 'KICK', 'BAN', 'UNBAN'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
  if (!/^\d{17,20}$/.test(discordId)) {
    return NextResponse.json({ error: 'Invalid discordId' }, { status: 400 });
  }

  const loggedReason = `[In-game${detail ? ` - ${detail}` : ''}] ${reason}`;

  const { error } = await supabaseAdmin.from('moderation_logs').insert({
    discord_id: discordId,
    username,
    action_type: action,
    reason: loggedReason,
    moderator_name: moderator,
  });
  if (error) {
    console.error('ingame moderation_logs insert failed:', error);
    return NextResponse.json({ error: 'Could not save log' }, { status: 500 });
  }

  if (action === 'BAN') await sendDm(discordId, banDmPayload(reason)); // appeal link

  await postMessage(moderationLogChannel(action), {
    embeds: [
      {
        title: `IN-GAME ${action}`,
        color: COLOURS[action],
        fields: [
          { name: 'Player', value: `<@${discordId}> (${username})`, inline: true },
          { name: 'Staff', value: moderator, inline: true },
          ...(detail ? [{ name: 'Length', value: detail, inline: true }] : []),
          { name: 'Reason', value: reason.slice(0, 1000) },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
    allowed_mentions: { parse: [] },
  });

  return NextResponse.json({ success: true });
}
