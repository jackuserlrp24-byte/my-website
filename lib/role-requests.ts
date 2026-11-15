import { supabaseAdmin } from '@/lib/portal';
import { addGuildRole } from '@/lib/discord';
import { REQUESTABLE_ROLES } from '@/lib/training-config';
import type { RoleRequest } from '@/lib/portal-types';

export type ReviewResult =
  | { ok: true; row: RoleRequest; label: string; message: string }
  | { ok: false; message: string };

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

  return { ok: true, row: { ...row, status, reviewed_by: reviewer }, label, message };
}
