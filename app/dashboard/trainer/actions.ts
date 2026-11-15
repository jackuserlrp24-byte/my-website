'use server';

import { revalidatePath } from 'next/cache';
import { getPortalUser, supabaseAdmin } from '@/lib/portal';
import { editMessage, postMessage } from '@/lib/discord';
import { reviewRoleRequest } from '@/lib/role-requests';
import { REQUESTABLE_ROLES, ROLE_REQUESTS_CHANNEL_ID } from '@/lib/training-config';
import { roleRequestPayload } from '@/lib/embeds';
import type { ActionResult, RoleRequest } from '@/lib/portal-types';

const fail = (message: string): ActionResult => ({ ok: false, message });

export async function requestRole(formData: FormData): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user?.canRequestRoles) return fail('Only trainers and Gold Command can request roles.');

  // Accept a raw ID or a pasted mention like <@123...>
  const rawTarget = String(formData.get('target') ?? '').trim();
  const targetId = rawTarget.replace(/[<@!>]/g, '');
  const roleKey = String(formData.get('roleKey') ?? '');
  const reason = String(formData.get('reason') ?? '').trim().slice(0, 500);

  if (!/^\d{17,20}$/.test(targetId)) return fail("Enter the member's Discord ID (right click them > Copy User ID).");
  const role = REQUESTABLE_ROLES.find((r) => r.key === roleKey);
  if (!role) return fail('Pick a role.');
  if (!reason) return fail('Add a reason or the training they passed.');

  // Make sure they are actually in the server and grab their display name.
  let targetName: string | null = null;
  const guild = process.env.DISCORD_GUILD_ID;
  if (guild && process.env.DISCORD_BOT_TOKEN) {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guild}/members/${targetId}`, {
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
      cache: 'no-store',
    });
    if (res.status === 404) return fail('That user is not in the server.');
    if (res.ok) {
      const m = await res.json();
      targetName = m.nick || m.user?.global_name || m.user?.username || null;
    }
  }

  const { data, error } = await supabaseAdmin
    .from('role_requests')
    .insert({
      target_discord_id: targetId,
      target_name: targetName,
      role_key: role.key,
      reason,
      requested_by: user.name,
      requested_by_id: user.id,
    })
    .select('*')
    .single();

  if (error || !data) {
    console.error('Role request insert failed:', error);
    return fail('Could not save the request. Have you run supabase/trainer-panel.sql?');
  }

  const row = data as RoleRequest;
  const messageId = await postMessage(ROLE_REQUESTS_CHANNEL_ID, roleRequestPayload(row, role.label));
  if (messageId) {
    await supabaseAdmin.from('role_requests').update({ discord_message_id: messageId }).eq('id', row.id);
  }

  revalidatePath('/dashboard/trainer');
  return {
    ok: true,
    message: messageId
      ? 'Role request sent to management in Discord.'
      : 'Request saved, but posting to Discord failed (check the bot token and channel permissions).',
  };
}

export async function decideRoleRequest(id: string, approve: boolean): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user?.canReviewRoleRequests) return fail('Only Gold Command can approve or deny role requests.');

  const result = await reviewRoleRequest(id, approve, user.name);
  if (!result.ok) return fail(result.message);

  // Update the Discord post so the buttons disappear there too.
  if (result.row.discord_message_id) {
    await editMessage(ROLE_REQUESTS_CHANNEL_ID, result.row.discord_message_id, roleRequestPayload(result.row, result.label, false));
  }

  revalidatePath('/dashboard/trainer');
  return { ok: true, message: result.message };
}
