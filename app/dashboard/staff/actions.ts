'use server';

import { revalidatePath } from 'next/cache';
import { getPortalUser, supabaseAdmin, MANAGEMENT_ROLE_IDS } from '@/lib/portal';
import {
  APPLICATIONS_LOG_CHANNEL_ID,
  banMember,
  getGuildMember,
  kickMember,
  postMessage,
  searchGuildMembers,
  sendDm,
  unbanMember,
  type GuildMemberLite,
} from '@/lib/discord';
import { GOLD_ROLE_ID } from '@/lib/training-config';
import type { ActionResult, ModerationAction, ModerationLog } from '@/lib/portal-types';

const STAFF_LOG_CHANNEL_ID = process.env.DISCORD_STAFF_LOG_CHANNEL_ID || APPLICATIONS_LOG_CHANNEL_ID;
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

export async function takeAction(formData: FormData): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user?.canStaff) return fail('You do not have access to the staff panel.');

  const action = String(formData.get('action') ?? '').toUpperCase() as ModerationAction;
  const targetId = String(formData.get('targetId') ?? '').replace(/[<@!>]/g, '').trim();
  const reason = String(formData.get('reason') ?? '').trim().slice(0, 1500);

  if (!['NOTE', 'WARN', 'KICK', 'BAN', 'UNBAN'].includes(action)) return fail('Pick an action.');
  if (!/^\d{17,20}$/.test(targetId)) return fail('Select a member (or enter a valid Discord ID).');
  if (reason.length < (action === 'NOTE' ? 1 : 5)) return fail('Add a reason (at least 5 characters).');
  if (action !== 'NOTE' && action !== 'WARN' && !user.canModerate) {
    return fail('Only Gold Command and management can kick, ban or unban.');
  }
  if (targetId === user.id) return fail('You cannot take action on yourself.');

  const member = await getGuildMember(targetId);
  const targetName = member?.name ?? (String(formData.get('targetName') ?? '').slice(0, 80) || 'Unknown');

  // Command members are protected from kicks / bans.
  if ((action === 'KICK' || action === 'BAN') && member) {
    const protectedIds = [...MANAGEMENT_ROLE_IDS, GOLD_ROLE_ID].filter(Boolean);
    if (member.roles.some((r) => protectedIds.includes(r))) {
      return fail('You cannot kick or ban Command / management members.');
    }
  }
  if (action === 'KICK' && !member) return fail('That user is not in the server.');

  // DM first - once they are kicked or banned the bot can no longer reach them.
  const dmTitle: Partial<Record<ModerationAction, string>> = {
    WARN: 'You have received a warning',
    KICK: 'You have been kicked from Central Operations',
    BAN: 'You have been banned from Central Operations',
  };
  let dmSent = false;
  if (dmTitle[action] && member) {
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
  if (action === 'KICK' || action === 'BAN' || action === 'UNBAN') {
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

  // Log it in the same table the Management > Moderation Logs tab uses.
  const { error } = await supabaseAdmin.from('moderation_logs').insert({
    discord_id: targetId,
    username: targetName,
    action_type: action,
    reason,
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
          ...(dmTitle[action] ? [{ name: 'DM delivered', value: dmSent ? 'Yes' : 'No', inline: true }] : []),
        ],
        timestamp: new Date().toISOString(),
      },
    ],
    allowed_mentions: { parse: [] },
  });

  revalidatePath('/dashboard/staff');
  revalidatePath('/dashboard/management');
  const done = { NOTE: 'Note added', WARN: 'Warning issued', KICK: 'Member kicked', BAN: 'Member banned', UNBAN: 'Member unbanned' }[action];
  return {
    ok: true,
    message: `${done} and logged.${error ? ' (Warning: could not save to moderation_logs - check the table columns.)' : ''}`,
  };
}
