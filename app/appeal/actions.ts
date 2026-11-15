'use server';

import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/portal';
import { parseSessionCookie, SESSION_COOKIE } from '@/lib/discord-auth';
import { createAppealTicket, type BanAppeal } from '@/lib/appeals';
import type { ActionResult } from '@/lib/portal-types';

const fail = (message: string): ActionResult => ({ ok: false, message });
const field = (fd: FormData, key: string, max: number) => String(fd.get(key) ?? '').trim().slice(0, max);

const COOLDOWN_HOURS = 24; // after a denial

export async function submitAppeal(formData: FormData): Promise<ActionResult> {
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return fail('Your login has expired. Please log in with Discord again.');

  const rpName = field(formData, 'rpName', 80);
  const banReason = field(formData, 'banReason', 1000);
  const appealReason = field(formData, 'appealReason', 1500);
  const extra = field(formData, 'extra', 1000);

  if (banReason.length < 5) return fail('Tell us what you think you were banned for.');
  if (appealReason.length < 30) return fail('Explain why you should be unbanned (at least 30 characters).');

  const { data: latest } = await supabaseAdmin
    .from('ban_appeals')
    .select('status, reviewed_at')
    .eq('discord_id', session.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest?.status === 'pending') return fail('You already have an appeal waiting for review.');
  if (latest?.status === 'denied' && latest.reviewed_at) {
    const waitMs = COOLDOWN_HOURS * 3600_000 - (Date.now() - new Date(latest.reviewed_at).getTime());
    if (waitMs > 0) return fail(`Your last appeal was denied. You can appeal again in ${Math.ceil(waitMs / 3600_000)} hour(s).`);
  }

  const username = session.global_name || session.username || null;
  const { data: row, error } = await supabaseAdmin
    .from('ban_appeals')
    .insert({
      discord_id: session.id,
      username,
      rp_name: rpName || null,
      ban_reason: banReason,
      appeal_reason: appealReason,
      extra: extra || null,
    })
    .select('*')
    .single();

  if (error || !row) {
    console.error('ban_appeals insert failed:', error);
    return fail('Could not save your appeal. Please try again later.');
  }

  const ticket = await createAppealTicket(row as BanAppeal);
  if (!ticket.ok) {
    // Do not leave a pending appeal that no staff member can see.
    await supabaseAdmin.from('ban_appeals').delete().eq('id', row.id);
    console.error('Appeal ticket failed:', ticket.error);
    return fail(`We could not open your appeal ticket (${ticket.error}) Please try again shortly or contact staff.`);
  }

  await supabaseAdmin.from('ban_appeals').update({ channel_id: ticket.channelId, message_id: ticket.messageId }).eq('id', row.id);
  return { ok: true, message: 'Your appeal has been sent to staff. You will be told the result here and by Discord DM if possible.' };
}
