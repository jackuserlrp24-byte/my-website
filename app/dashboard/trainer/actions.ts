'use server';

import { revalidatePath } from 'next/cache';
import { getPortalUser, supabaseAdmin } from '@/lib/portal';
import { editMessage, postMessage } from '@/lib/discord';
import { logRoleRequest, reviewRoleRequest } from '@/lib/role-requests';
import { REQUESTABLE_ROLES, ROLE_REQUESTS_CHANNEL_ID } from '@/lib/training-config';
import { roleRequestPayload } from '@/lib/embeds';
import type { ActionResult, RoleRequest } from '@/lib/portal-types';

const fail = (message: string): ActionResult => ({ ok: false, message });

const MAX_ROLES_PER_REQUEST = 15;

/** One request can ask for several roles at once: each role becomes its own request + Discord post so it can be approved / denied separately. */
export async function requestRole(formData: FormData): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user?.canRequestRoles) return fail('Only Bronze, Silver or Gold Command (and trainers) can request roles.');

  // Accept a raw ID or a pasted mention like <@123...>
  const rawTarget = String(formData.get('target') ?? '').trim();
  const targetId = rawTarget.replace(/[<@!>]/g, '');
  const roleKeys = Array.from(new Set(formData.getAll('roleKey').map(String)));
  const reason = String(formData.get('reason') ?? '').trim().slice(0, 500);

  if (!/^\d{17,20}$/.test(targetId)) return fail("Enter the member's Discord ID (right click them > Copy User ID).");
  if (roleKeys.length === 0) return fail('Pick at least one role.');
  if (roleKeys.length > MAX_ROLES_PER_REQUEST) return fail(`You can request up to ${MAX_ROLES_PER_REQUEST} roles at once.`);
  const roles = roleKeys.map((k) => REQUESTABLE_ROLES.find((r) => r.key === k));
  if (roles.some((r) => !r)) return fail('One of the selected roles is not valid.');
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

  let saved = 0;
  let posted = 0;
  for (const role of roles as NonNullable<(typeof roles)[number]>[]) {
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
      continue;
    }
    saved++;

    const row = data as RoleRequest;
    await logRoleRequest('requested', row, role.label);
    const messageId = await postMessage(ROLE_REQUESTS_CHANNEL_ID, roleRequestPayload(row, role.label));
    if (messageId) {
      posted++;
      await supabaseAdmin.from('role_requests').update({ discord_message_id: messageId }).eq('id', row.id);
    }
  }

  revalidatePath('/dashboard/trainer');
  if (saved === 0) return fail('Could not save the request. Have you run supabase/trainer-panel.sql?');

  const noun = saved === 1 ? 'role request' : 'role requests';
  const partial = saved < roleKeys.length ? ` (${roleKeys.length - saved} could not be saved)` : '';
  return {
    ok: true,
    message:
      posted === saved
        ? `${saved} ${noun} sent to Silver / Gold Command in Discord${partial}.`
        : `${saved} ${noun} saved, but ${saved - posted} failed to post to Discord (check the bot token and channel permissions)${partial}.`,
  };
}

export async function decideRoleRequest(id: string, approve: boolean): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user?.canReviewRoleRequests) return fail('Only Silver or Gold Command can approve or deny role requests.');

  const result = await reviewRoleRequest(id, approve, user.name);
  if (!result.ok) return fail(result.message);

  // Update the Discord post so the buttons disappear there too.
  if (result.row.discord_message_id) {
    await editMessage(ROLE_REQUESTS_CHANNEL_ID, result.row.discord_message_id, roleRequestPayload(result.row, result.label, false));
  }

  revalidatePath('/dashboard/trainer');
  return { ok: true, message: result.message };
}
