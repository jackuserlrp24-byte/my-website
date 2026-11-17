import { getPortalUser, WHITELISTED_ROLES, type PortalUser } from '@/lib/portal';
import { BRONZE_ROLE_ID, GOLD_ROLE_ID, SILVER_ROLE_ID, hasRoleId } from '@/lib/training-config';

/** Any normal portal member (whitelisted officer), plus command and management, can open the officer area. */
export async function getOfficer(): Promise<PortalUser | null> {
  const u = await getPortalUser();
  if (!u) return null;
  const ok = u.isManagement || u.isCommand || u.roles.some((r) => WHITELISTED_ROLES.includes(r));
  return ok ? u : null;
}

/** Command + management ONLY can post / delete announcements and see every officer's footage. Normal officers cannot. */
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

/**
 * Command area roles.
 *  - Police Collisions: Driving Standards Department role, Gold command, or management.
 *  - Firearms PIP (post incident procedure): MO19 command role only (management can always open it so nobody is locked out).
 * Set DISCORD_MO19_COMMAND_ROLE_ID in Vercel to the ID of your MO19 Command role. Until it is set, only management can open Firearms PIP.
 */
export const DRIVING_STANDARDS_ROLE_ID = process.env.DISCORD_DRIVING_STANDARDS_ROLE_ID || '1559219008744726598';
export const MO19_COMMAND_ROLE_ID = process.env.DISCORD_MO19_COMMAND_ROLE_ID || '';

type RoleUser = Pick<PortalUser, 'roles' | 'isManagement'>;

export const canViewCollisions = (u: RoleUser) =>
  u.isManagement || hasRoleId(u.roles, GOLD_ROLE_ID) || hasRoleId(u.roles, DRIVING_STANDARDS_ROLE_ID);

export const canViewFirearms = (u: RoleUser) => u.isManagement || hasRoleId(u.roles, MO19_COMMAND_ROLE_ID);

/** The Command tab shows for command, or for anyone who holds a role that opens one of its sections. */
export const canOpenCommandArea = (u: PortalUser) => canManageMet(u) || canViewCollisions(u) || canViewFirearms(u);
