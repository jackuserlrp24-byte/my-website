import { supabaseAdmin, MANAGEMENT_ROLE_IDS } from '@/lib/portal';
import { createPrivateChannel, getGuildBan, postMessage, sendDm, unbanMember } from '@/lib/discord';
import { queueGameAction } from '@/lib/game-actions';
import { GOLD_ROLE_ID, MODERATION_LOG_CHANNEL_ID } from '@/lib/training-config';

export interface BanAppeal {
  id: string;
  discord_id: string;
  username: string | null;
  rp_name: string | null;
  ban_reason: string | null;
  appeal_reason: string;
  extra: string | null;
  status: 'pending' | 'accepted' | 'denied';
  reviewed_by: string | null;
  review_note: string | null;
  channel_id: string | null;
  message_id: string | null;
  created_at: string;
  reviewed_at: string | null;
}

interface ModLog {
  action_type: string;
  reason: string | null;
  moderator_name: string | null;
  created_at: string;
}

// Staff who can see the ticket channel: management + Gold command (+ any extra roles from env, comma separated).
const extraStaff = (process.env.DISCORD_APPEAL_STAFF_ROLE_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
export const APPEAL_STAFF_ROLE_IDS = [...MANAGEMENT_ROLE_IDS, GOLD_ROLE_ID, ...extraStaff].filter(Boolean);
const APPEAL_CATEGORY_ID = process.env.DISCORD_APPEAL_CATEGORY_ID || undefined;

const unix = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);
const clip = (v: string | null | undefined, n: number) => {
  const t = (v ?? '').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};
const snowflakeDate = (id: string) => Math.floor((Math.floor(Number(id) / 4194304) + 1420070400000) / 1000);

const ACTION_COLOURS: Record<string, number> = { WARN: 16705372, KICK: 15105570, BAN: 15548997, UNBAN: 5763719, NOTE: 9807270 };

export async function getHistory(discordId: string): Promise<ModLog[]> {
  const { data } = await supabaseAdmin
    .from('moderation_logs')
    .select('action_type, reason, moderator_name, created_at')
    .eq('discord_id', discordId)
    .order('created_at', { ascending: false })
    .limit(200);
  return (data ?? []) as ModLog[];
}

function historyDescription(history: ModLog[]): string {
  if (!history.length) return 'No moderation history on record.';
  let out = '';
  let shown = 0;
  for (const h of history) {
    const line = `**${h.action_type}** · <t:${unix(h.created_at)}:d> · ${clip(h.moderator_name, 40) || 'Unknown'}\n> ${clip(h.reason, 180) || 'No reason'}\n`;
    if (out.length + line.length > 3700) break;
    out += line;
    shown++;
  }
  return shown < history.length ? `${out}…and ${history.length - shown} older entries.` : out.trimEnd();
}

/** Opens the private ticket channel and posts the appeal + player history + Accept / Deny buttons. */
export async function createAppealTicket(
  appeal: BanAppeal
): Promise<{ ok: true; channelId: string; messageId: string } | { ok: false; error: string }> {
  const [history, ban, whitelistRes, previous] = await Promise.all([
    getHistory(appeal.discord_id),
    getGuildBan(appeal.discord_id),
    supabaseAdmin.from('user_whitelists').select('rp_name, collar_number, forename, surname').eq('discord_id', appeal.discord_id).maybeSingle(),
    supabaseAdmin.from('ban_appeals').select('status').eq('discord_id', appeal.discord_id).neq('id', appeal.id),
  ]);

  const count = (t: string) => history.filter((h) => h.action_type === t).length;
  const lastBan = history.find((h) => h.action_type === 'BAN');
  const lastUnbanAfter = lastBan ? history.find((h) => h.action_type === 'UNBAN' && unix(h.created_at) > unix(lastBan.created_at)) : null;
  const w = whitelistRes.data as { rp_name?: string; collar_number?: number | string; forename?: string; surname?: string } | null;
  const prev = (previous.data ?? []) as { status: string }[];

  const shortName = (appeal.username || appeal.discord_id).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'player';
  const channel = await createPrivateChannel({
    name: `appeal-${shortName}`,
    topic: `Ban appeal from ${appeal.username ?? appeal.discord_id} (${appeal.discord_id})`,
    parentId: APPEAL_CATEGORY_ID,
    staffRoleIds: APPEAL_STAFF_ROLE_IDS,
  });
  if (!channel.ok) return { ok: false, error: channel.error };

  const banLine = [
    ban ? `**Discord ban:** Yes${ban.reason ? ` - ${clip(ban.reason, 200)}` : ''}` : '**Discord ban:** No active Discord ban found',
    lastBan && !lastUnbanAfter
      ? `**Portal/in-game ban:** <t:${unix(lastBan.created_at)}:f> by ${clip(lastBan.moderator_name, 40) || 'Unknown'}\n> ${clip(lastBan.reason, 300) || 'No reason'}`
      : '**Portal/in-game ban:** none on record (or already lifted)',
  ].join('\n');

  const embeds = [
    {
      title: 'BAN APPEAL',
      color: 5793266,
      description: `<@${appeal.discord_id}> (${appeal.username ?? 'Unknown'}) has submitted a ban appeal.`,
      fields: [
        { name: 'Discord ID', value: `\`${appeal.discord_id}\``, inline: true },
        { name: 'Account created', value: `<t:${snowflakeDate(appeal.discord_id)}:D>`, inline: true },
        { name: 'RP / Portal name', value: clip(appeal.rp_name || w?.rp_name || (w ? `${w.forename ?? ''} ${w.surname ?? ''}` : '') || 'Not provided', 80), inline: true },
        ...(w?.collar_number ? [{ name: 'Collar', value: `[${w.collar_number}]`, inline: true }] : []),
        { name: 'Previous appeals', value: prev.length ? `${prev.length} (${prev.filter((p) => p.status === 'denied').length} denied)` : 'None', inline: true },
        { name: 'Ban status', value: banLine.slice(0, 1024) },
        { name: 'Why they say they were banned', value: clip(appeal.ban_reason, 1000) || 'Not provided' },
        { name: 'Why they should be unbanned', value: clip(appeal.appeal_reason, 1000) },
        ...(appeal.extra ? [{ name: 'Extra / evidence', value: clip(appeal.extra, 1000) }] : []),
      ],
      timestamp: appeal.created_at,
    },
    {
      title: `PLAYER HISTORY - ${count('WARN')} warns · ${count('KICK')} kicks · ${count('BAN')} bans · ${count('UNBAN')} unbans · ${count('NOTE')} notes`,
      color: 15548997,
      description: historyDescription(history),
    },
  ];

  const messageId = await postMessage(channel.id, {
    content: 'A new ban appeal needs a decision.',
    embeds,
    components: [
      {
        type: 1,
        components: [
          { type: 2, style: 3, label: 'Accept & Unban', custom_id: `appeal_accept:${appeal.id}` },
          { type: 2, style: 4, label: 'Deny', custom_id: `appeal_deny:${appeal.id}` },
        ],
      },
    ],
    allowed_mentions: { parse: [] },
  });
  if (!messageId) return { ok: false, error: 'The ticket channel was created but the bot could not post in it.' };

  return { ok: true, channelId: channel.id, messageId };
}

export type ReviewAppealResult =
  | { ok: true; appeal: BanAppeal; summary: string }
  | { ok: false; message: string };

/** Accept (unban everywhere) or deny an appeal. Caller must already have checked the reviewer is Gold / management. */
export async function reviewAppeal(id: string, accept: boolean, reviewer: string, note: string): Promise<ReviewAppealResult> {
  const { data } = await supabaseAdmin.from('ban_appeals').select('*').eq('id', id).maybeSingle();
  if (!data) return { ok: false, message: 'Appeal not found.' };
  const appeal = data as BanAppeal;
  if (appeal.status !== 'pending') return { ok: false, message: `This appeal was already ${appeal.status}.` };

  const cleanNote = clip(note, 800);
  const notes: string[] = [];

  if (accept) {
    // 1) Discord ban (404 just means they were not banned on Discord)
    const d = await unbanMember(appeal.discord_id, `Ban appeal accepted by ${reviewer}`);
    if (d.ok) notes.push('Unbanned on Discord.');
    else if (d.status === 404) notes.push('No Discord ban to lift.');
    else notes.push(`Could not unban on Discord (${d.status || 'no response'}) - check the bot has Ban Members.`);

    // 2) In-game ban list
    const q = await queueGameAction({
      action: 'unban',
      targetDiscordId: appeal.discord_id,
      targetName: appeal.username,
      reason: `Ban appeal accepted by ${reviewer}`,
      requestedBy: reviewer,
    });
    notes.push(q.ok ? 'Unban sent to the game server.' : 'Could not queue the in-game unban (run the latest full-setup.sql).');
  }

  // Claim it (only if still pending) so a double-click can never run twice.
  const { data: claimed } = await supabaseAdmin
    .from('ban_appeals')
    .update({ status: accept ? 'accepted' : 'denied', reviewed_by: reviewer, review_note: cleanNote || null, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle();
  if (!claimed) return { ok: false, message: 'Someone else already decided this appeal.' };

  // History entry
  await supabaseAdmin.from('moderation_logs').insert({
    discord_id: appeal.discord_id,
    username: appeal.username ?? 'Unknown',
    action_type: accept ? 'UNBAN' : 'NOTE',
    reason: accept ? `Ban appeal accepted${cleanNote ? `: ${cleanNote}` : ''}` : `Ban appeal denied${cleanNote ? `: ${cleanNote}` : ''}`,
    moderator_name: reviewer,
  });

  // Tell the player (DMs may be closed, especially if they are banned from the server - the appeal page shows the result too)
  const dm = await sendDm(appeal.discord_id, {
    embeds: [
      {
        title: accept ? 'Your ban appeal was accepted' : 'Your ban appeal was denied',
        description: accept
          ? 'Your ban has been lifted. If you were removed from the Discord server, use the server invite to rejoin, then log in to the portal again.'
          : 'Staff have reviewed your appeal and decided to keep the ban in place.',
        color: accept ? 5763719 : 15548997,
        fields: cleanNote ? [{ name: 'Staff note', value: cleanNote }] : [],
        footer: { text: 'Central Operations' },
        timestamp: new Date().toISOString(),
      },
    ],
  });
  notes.push(dm ? 'Player notified by DM.' : 'Could not DM the player (they can see the result on the appeal page).');

  await postMessage(MODERATION_LOG_CHANNEL_ID, {
    embeds: [
      {
        title: `BAN APPEAL ${accept ? 'ACCEPTED' : 'DENIED'}`,
        color: ACTION_COLOURS[accept ? 'UNBAN' : 'BAN'],
        fields: [
          { name: 'Player', value: `<@${appeal.discord_id}> (${appeal.username ?? 'Unknown'})`, inline: true },
          { name: 'Decided by', value: reviewer, inline: true },
          ...(cleanNote ? [{ name: 'Note', value: cleanNote }] : []),
        ],
        timestamp: new Date().toISOString(),
      },
    ],
    allowed_mentions: { parse: [] },
  });

  return { ok: true, appeal: claimed as BanAppeal, summary: notes.join(' ') };
}
