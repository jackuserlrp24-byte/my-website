import { supabaseAdmin } from '@/lib/portal';
import { addGuildRole, postMessage } from '@/lib/discord';
import { REQUESTABLE_ROLES, ROLE_LOG_CHANNEL_ID } from '@/lib/training-config';
import type { RoleRequest } from '@/lib/portal-types';

export type ReviewResult =
  | { ok: true; row: RoleRequest; label: string; message: string }
  | { ok: false; message: string };

const clip = (v: string, n: number) => (v.length > n ? `${v.slice(0, n - 1)}…` : v);

/** Writes a role request event (requested / approved / denied) to the role request log channel. Never throws. */
export async function logRoleRequest(
  kind: 'requested' | 'approved' | 'denied',
  row: RoleRequest,
  label: string,
  reviewer?: string,
  note?: string
) {
  try {
    const role = REQUESTABLE_ROLES.find((r) => r.key === row.role_key);
    const colour = kind === 'approved' ? 5763719 : kind === 'denied' ? 15548997 : 16705372;
    const title = kind === 'requested' ? 'ROLE REQUESTED' : kind === 'approved' ? 'ROLE REQUEST APPROVED' : 'ROLE REQUEST DENIED';
    await postMessage(ROLE_LOG_CHANNEL_ID, {
      embeds: [
        {
          title,
          color: colour,
          fields: [
            { name: 'Member', value: `<@${row.target_discord_id}>${row.target_name ? `\n${row.target_name}` : ''}\n\`${row.target_discord_id}\``, inline: true },
            { name: 'Role', value: role?.roleId ? `${label}\n<@&${role.roleId}>` : label, inline: true },
            { name: 'Requested by', value: `${row.requested_by}\n<@${row.requested_by_id}>`, inline: true },
            ...(row.reason ? [{ name: 'Reason', value: clip(row.reason, 1000), inline: false }] : []),
            ...(reviewer ? [{ name: kind === 'approved' ? 'Approved by' : 'Denied by', value: reviewer, inline: true }] : []),
            ...(note ? [{ name: 'Result', value: clip(note, 500), inline: false }] : []),
          ],
          timestamp: new Date().toISOString(),
        },
      ],
      allowed_mentions: { parse: [] },
    });
  } catch (err) {
    console.error('Role request log failed:', err);
  }
}

/**
 * Approves or denies a role request. On approval the bot adds the Discord role to the member.
 * The caller must already have checked the reviewer is gold command / management.
 */
export async function reviewRoleRequest(id: string, approve: boolean, reviewer: string): Promise<ReviewResult> {
  const { data } = await supabaseAdmin.from('role_requests').select('*').eq('id', id).maybeSingle();
  if (!data) return { ok: false, message: 'Role request not found.' };
  const row = data as RoleRequest;
  if (row.status !== 'pending') return { ok: false, message: `This request was already ${row.status}.` };

  const role = REQUESTABLE_ROLES.find((r) => r.key === row.role_key);
  const label = role?.label ?? row.role_key;
  let message = approve ? 'Approved.' : 'Denied.';

  if (approve && role?.roleId) {
    const ok = await addGuildRole(row.target_discord_id, role.roleId);
    if (!ok) {
      return {
        ok: false,
        message: 'Could not give the role on Discord. Check the bot has Manage Roles and its role sits above that role.',
      };
    }
    message = `Approved - ${label} role added on Discord.`;
  } else if (approve) {
    message = 'Approved - this role is manual, so please add it on Discord yourself.';
  }

  const status = approve ? 'approved' : 'denied';
  await supabaseAdmin
    .from('role_requests')
    .update({ status, reviewed_by: reviewer, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending');

  const finalRow = { ...row, status, reviewed_by: reviewer } as RoleRequest;
  await logRoleRequest(approve ? 'approved' : 'denied', finalRow, label, reviewer, message);

  return { ok: true, row: finalRow, label, message };
}
