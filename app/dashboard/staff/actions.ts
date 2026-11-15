'use server';

import { revalidatePath } from 'next/cache';
import { getPortalUser, supabaseAdmin, MANAGEMENT_ROLE_IDS } from '@/lib/portal';
import {
  banMember,
  getGuildMember,
  kickMember,
  postMessage,
  searchGuildMembers,
  sendDm,
  banDmPayload,
  sendUnbanNotice,
  unbanMember,
  type GuildMemberLite,
} from '@/lib/discord';
import { GOLD_ROLE_ID, MODERATION_LOG_CHANNEL_ID } from '@/lib/training-config';
import { queueGameAction } from '@/lib/game-actions';
import { getAop, saveAop } from '@/lib/aop';
import { AOP_AREAS, formatAop } from '@/lib/aop-config';
import type { ActionResult, GameAction, ModerationAction, ModerationLog } from '@/lib/portal-types';

// Warn / kick / ban logs go to the moderation channel only (never the role request channel).
const STAFF_LOG_CHANNEL_ID = MODERATION_LOG_CHANNEL_ID;
const fail = (message: string): ActionResult => ({ ok: false, message });

const COLOURS: Record<ModerationAction, number> = {
  NOTE: 5793266,
  WARN: 16705372,
  KICK: 15105570,
  BAN: 15548997,
  UNBAN: 5763719,
};

export async function searchMembers(query: string): Promise<GuildMemberLite[]> {
  const user = await getPortalUser();
  if (!user?.canStaff) return [];
  const q = query.trim().replace(/[<@!>]/g, '');
  if (q.length < 2) return [];

  if (/^\d{17,20}$/.test(q)) {
    const m = await getGuildMember(q);
    return m ? [m] : [{ id: q, name: 'Not in server', username: q, avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png', roles: [] }];
  }

  const found = new Map<string, GuildMemberLite>();
  (await searchGuildMembers(q)).forEach((m) => found.set(m.id, m));

  // Also match RP name / collar number from the whitelist so staff can search by character.
  const { data } = await supabaseAdmin
    .from('user_whitelists')
    .select('discord_id')
    .or(`rp_name.ilike.%${q.replace(/[%,()]/g, '')}%,collar_number.ilike.%${q.replace(/[%,()]/g, '')}%`)
    .limit(5);
  for (const row of data ?? []) {
    if (row.discord_id && !found.has(row.discord_id)) {
      const m = await getGuildMember(row.discord_id);
      if (m) found.set(m.id, m);
    }
  }
  return Array.from(found.values()).slice(0, 10);
}

export async function getHistory(discordId: string): Promise<ModerationLog[]> {
  const user = await getPortalUser();
  if (!user?.canStaff) return [];
  const { data } = await supabaseAdmin
    .from('moderation_logs')
    .select('*')
    .eq('discord_id', discordId)
    .order('created_at', { ascending: false })
    .limit(50);
  return (data ?? []) as ModerationLog[];
}

export async function getGameActions(): Promise<GameAction[]> {
  const user = await getPortalUser();
  if (!user?.canStaff) return [];
  const { data } = await supabaseAdmin
    .from('game_actions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(12);
  return (data ?? []) as GameAction[];
}

export async function takeAction(formData: FormData): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user?.canStaff) return fail('You do not have access to the staff panel.');

  const action = String(formData.get('action') ?? '').toUpperCase() as ModerationAction;
  const targetId = String(formData.get('targetId') ?? '').replace(/[<@!>]/g, '').trim();
  const reason = String(formData.get('reason') ?? '').trim().slice(0, 1500);

  // Where the action is applied: Discord, the FiveM server, or both. Notes are portal-only.
  const rawScope = String(formData.get('scope') ?? 'discord');
  const scope: 'discord' | 'game' | 'both' = rawScope === 'game' || rawScope === 'both' ? rawScope : 'discord';
  const toDiscord = action === 'NOTE' || scope !== 'game';
  const toGame = action !== 'NOTE' && scope !== 'discord';
  const banHours = Math.min(Math.max(Math.round(Number(formData.get('banHours') ?? 0)) || 0, 0), 24 * 365);

  if (!['NOTE', 'WARN', 'KICK', 'BAN', 'UNBAN'].includes(action)) return fail('Pick an action.');
  if (!/^\d{17,20}$/.test(targetId)) return fail('Select a member (or enter a valid Discord ID).');
  if (reason.length < (action === 'NOTE' ? 1 : 5)) return fail('Add a reason (at least 5 characters).');
  if (action !== 'NOTE' && action !== 'WARN' && !user.canModerate) {
    return fail('Only Gold Command and management can kick, ban or unban.');
  }
  // Testing yourself: a WARN, or a KICK that only applies in the FiveM server, is allowed.
  // Anything that could remove you from Discord / ban you stays blocked.
  const isSelf = targetId === user.id;
  if (isSelf && !(action === 'WARN' || (action === 'KICK' && scope === 'game'))) {
    return fail('On yourself you can only WARN, or KICK with "Apply to" set to FiveM server only.');
  }

  const member = await getGuildMember(targetId);
  const targetName = member?.name ?? (String(formData.get('targetName') ?? '').slice(0, 80) || 'Unknown');

  // Gold Command is protected from kicks / bans. Management and Ownership CAN be kicked / banned
  // (only by someone who can moderate, and never yourself).
  if ((action === 'KICK' || action === 'BAN') && member && !isSelf) {
    const isGold = !!GOLD_ROLE_ID && member.roles.includes(GOLD_ROLE_ID);
    const isMgmt = member.roles.some((r) => MANAGEMENT_ROLE_IDS.includes(r));
    if (isGold && !isMgmt) {
      return fail('You cannot kick or ban Gold Command members.');
    }
  }
  if (action === 'KICK' && toDiscord && !member) return fail('That user is not in the Discord server.');

  // DM first - once they are kicked or banned the bot can no longer reach them.
  const dmTitle: Partial<Record<ModerationAction, string>> = {
    WARN: 'You have received a warning',
    KICK: 'You have been kicked from Central Operations',
    BAN: 'You have been banned from Central Operations',
  };
  let dmSent = false;
  if (action === 'BAN' && member) {
    // Bans (Discord or in-game only) always DM the appeal link.
    dmSent = await sendDm(targetId, banDmPayload(reason));
  } else if (dmTitle[action] && member && toDiscord) {
    dmSent = await sendDm(targetId, {
      embeds: [
        {
          title: dmTitle[action],
          description: `**Reason:** ${reason}`,
          color: COLOURS[action],
          footer: { text: 'Central Operations' },
          timestamp: new Date().toISOString(),
        },
      ],
    });
  }

  // Do the real Discord action.
  if (toDiscord && (action === 'KICK' || action === 'BAN' || action === 'UNBAN')) {
    const fn = action === 'KICK' ? kickMember : action === 'BAN' ? banMember : unbanMember;
    const res = await fn(targetId, `${action} by ${user.name} via portal: ${reason}`);
    if (!res.ok) {
      return fail(
        res.status === 403
          ? 'Discord refused. The bot needs Kick/Ban Members, and its role must be above that member.'
          : res.status === 404 && action === 'UNBAN'
          ? 'That user is not banned.'
          : `Discord action failed (${res.status || 'no response'}).`
      );
    }
  }

  // Unbanned on Discord -> DM them a brand-new invite so they can rejoin.
  let unbanDm: { dmSent: boolean; inviteUrl: string | null } | null = null;
  if (action === 'UNBAN' && toDiscord) {
    unbanDm = await sendUnbanNotice(targetId, {
      title: 'You have been unbanned from Central Operations',
      description: 'Your ban has been lifted.',
      note: reason,
    });
  }

  // Queue it for the FiveM server (picked up by the CO-StaffMenu resource within a few seconds).
  let gameQueued = false;
  if (toGame) {
    const q = await queueGameAction({
      action: action.toLowerCase() as 'warn' | 'kick' | 'ban' | 'unban',
      targetDiscordId: targetId,
      targetName,
      reason,
      durationHours: action === 'BAN' ? banHours : 0,
      requestedBy: user.name,
    });
    if (!q.ok) {
      return fail(
        toDiscord
          ? 'The Discord action went through, but it could not be queued for the game server. Have you run the latest supabase/full-setup.sql?'
          : 'Could not queue the in-game action. Have you run the latest supabase/full-setup.sql?'
      );
    }
    gameQueued = true;
  }

  const where = scope === 'both' && action !== 'NOTE' ? 'Discord + In-game' : toGame ? 'In-game' : 'Discord';
  const lengthText = toGame && action === 'BAN' ? (banHours > 0 ? ` - ${banHours >= 24 && banHours % 24 === 0 ? `${banHours / 24} day(s)` : `${banHours}h`}` : ' - permanent') : '';
  const loggedReason = action === 'NOTE' || where === 'Discord' ? reason : `[${where}${lengthText}] ${reason}`;

  // Log it in the same table the Management > Moderation Logs tab uses.
  const { error } = await supabaseAdmin.from('moderation_logs').insert({
    discord_id: targetId,
    username: targetName,
    action_type: action,
    reason: loggedReason,
    moderator_name: user.name,
  });
  if (error) console.error('moderation_logs insert failed:', error);

  await postMessage(STAFF_LOG_CHANNEL_ID, {
    embeds: [
      {
        title: `STAFF ${action}`,
        color: COLOURS[action],
        fields: [
          { name: 'Member', value: `<@${targetId}> (${targetName})`, inline: true },
          { name: 'Staff', value: `${user.name} (<@${user.id}>)`, inline: true },
          { name: 'Reason', value: reason.slice(0, 1000) },
          ...(action !== 'NOTE' ? [{ name: 'Applied to', value: `${where}${lengthText}`, inline: true }] : []),
          ...(dmTitle[action] && toDiscord ? [{ name: 'DM delivered', value: dmSent ? 'Yes' : 'No', inline: true }] : []),
          ...(unbanDm ? [{ name: 'Rejoin invite', value: `${unbanDm.inviteUrl ? 'Created' : 'Not needed / unavailable'} · DM ${unbanDm.dmSent ? 'delivered' : 'not delivered'}`, inline: true }] : []),
        ],
        timestamp: new Date().toISOString(),
      },
    ],
    allowed_mentions: { parse: [] },
  });

  revalidatePath('/dashboard/staff');
  revalidatePath('/dashboard/staff/management');
  const done = { NOTE: 'Note added', WARN: 'Warning issued', KICK: 'Member kicked', BAN: 'Member banned', UNBAN: 'Member unbanned' }[action];
  return {
    ok: true,
    message: `${done} and logged.${gameQueued ? ' Sent to the game server - it applies within a few seconds (see "In-game actions").' : ''}${unbanDm ? (unbanDm.inviteUrl ? ` New rejoin invite ${unbanDm.dmSent ? 'sent by DM' : 'created, but the DM could not be delivered - give them this link: ' + unbanDm.inviteUrl}.` : ' No new invite sent (already in server or bot lacks Create Invite).') : ''}${error ? ' (Warning: could not save to moderation_logs - check the table columns.)' : ''}`,
  };
}

/** The AOP currently set for the game server (staff panel card). */
export async function getCurrentAop() {
  const user = await getPortalUser();
  if (!user?.canStaff) return null;
  return getAop();
}

/** Sets the AOP from the staff panel. The FiveM server picks it up within ~10 seconds and shows it on every HUD. */
export async function setAop(areas: string[]): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user?.canStaff) return fail('You do not have permission to change the AOP.');

  const valid = (Array.isArray(areas) ? areas : []).filter((a) => (AOP_AREAS as readonly string[]).includes(a));
  if (!valid.length) return fail('Pick at least one area.');

  const aop = formatAop(valid);
  const stamp = await saveAop(aop, user.name);
  if (!stamp) return fail('Could not save the AOP. Try again.');

  revalidatePath('/dashboard/staff');
  return { ok: true, message: `AOP set to ${aop}. It shows in game within a few seconds.` };
}
