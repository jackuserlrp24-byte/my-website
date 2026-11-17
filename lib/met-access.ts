import { getPortalUser, WHITELISTED_ROLES, type PortalUser } from '@/lib/portal';

/** Any normal portal member (whitelisted officer), plus command and management, can open the officer area. */
export async function getOfficer(): Promise<PortalUser | null> {
  const u = await getPortalUser();
  if (!u) return null;
  const ok = u.isManagement || u.isCommand || u.roles.some((r) => WHITELISTED_ROLES.includes(r));
  return ok ? u : null;
}

/** Command + management can post announcements and see / delete every officer's footage. */
export const canManageMet = (u: PortalUser) => u.isManagement || u.isCommand;
