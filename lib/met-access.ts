import { getPortalUser, WHITELISTED_ROLES, type PortalUser } from '@/lib/portal';
import { BRONZE_ROLE_ID, GOLD_ROLE_ID, SILVER_ROLE_ID, hasRoleId } from '@/lib/training-config';

/** Any normal portal member (whitelisted officer), plus command and management, can open the officer area. */
export async function getOfficer(): Promise<PortalUser | null> {
  const u = await getPortalUser();
  if (!u) return null;
  const ok = u.isManagement || u.isCommand || u.roles.some((r) => WHITELISTED_ROLES.includes(r));
  return ok ? u : null;
}

/** Command + management can post announcements and see / delete every officer's footage. */
export const canManageMet = (u: PortalUser) => u.isManagement || u.isCommand;

/**
 * Command RANK = Gold, Silver or Bronze command (or management).
 * Used for things only the ranked command team may see, such as the duty rota on the LOA page.
 * Role IDs live in lib/training-config.ts (Gold 1532843318197747872, Silver 1532828760410427432, Bronze 1532828869944545410).
 */
export const hasCommandRank = (u: Pick<PortalUser, 'roles' | 'isManagement'>) =>
  u.isManagement ||
  hasRoleId(u.roles, GOLD_ROLE_ID) ||
  hasRoleId(u.roles, SILVER_ROLE_ID) ||
  hasRoleId(u.roles, BRONZE_ROLE_ID);
