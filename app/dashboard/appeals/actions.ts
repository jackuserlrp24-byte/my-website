'use server';

import { revalidatePath } from 'next/cache';
import { getPortalUser, supabaseAdmin } from '@/lib/portal';
import { getHistory as getModHistory, reviewAppeal, type BanAppeal } from '@/lib/appeals';
import { editMessage, postMessage } from '@/lib/discord';
import type { ActionResult, ModerationLog } from '@/lib/portal-types';

const fail = (message: string): ActionResult => ({ ok: false, message });

/** All appeals, newest first (Silver+ can view, Gold / management can decide). */
export async function listAppeals(): Promise<BanAppeal[]> {
  const user = await getPortalUser();
  if (!user?.canStaff) return [];
  const { data } = await supabaseAdmin.from('ban_appeals').select('*').order('created_at', { ascending: false }).limit(200);
  return (data ?? []) as BanAppeal[];
}

export async function getAppealHistory(discordId: string): Promise<ModerationLog[]> {
  const user = await getPortalUser();
  if (!user?.canStaff || !/^\d{17,20}$/.test(discordId)) return [];
  return (await getModHistory(discordId)) as unknown as ModerationLog[];
}

export async function decideAppeal(id: string, accept: boolean, note: string): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user?.canModerate) return fail('Only Gold Command and management can decide ban appeals.');

  const cleanNote = note.trim().slice(0, 800);
  if (!accept && cleanNote.length < 3) return fail('Add a reason - the player is shown it.');

  const result = await reviewAppeal(id, accept, user.name, cleanNote);
  if (!result.ok) return fail(result.message);

  // Keep the Discord ticket in sync: remove the Accept / Deny buttons and say what happened.
  const { channel_id, message_id } = result.appeal;
  if (channel_id && message_id) {
    await editMessage(channel_id, message_id, { components: [] });
    await postMessage(channel_id, {
      embeds: [
        {
          title: accept ? 'APPEAL ACCEPTED' : 'APPEAL DENIED',
          color: accept ? 5763719 : 15548997,
          description: `${accept ? 'Accepted' : 'Denied'} by **${user.name}** from the web dashboard.${cleanNote ? `\n**Note:** ${cleanNote}` : ''}\n${result.summary}`,
          timestamp: new Date().toISOString(),
        },
      ],
      allowed_mentions: { parse: [] },
    });
  }

  revalidatePath('/dashboard/appeals');
  revalidatePath('/dashboard/staff/appeals');
  revalidatePath('/dashboard/management');
  revalidatePath('/dashboard/staff/management');
  return { ok: true, message: `Appeal ${accept ? 'accepted' : 'denied'}. ${result.summary}` };
}
