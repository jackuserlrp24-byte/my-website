import { getPortalUser, type PortalUser } from '@/lib/portal';
import { LAS_RANK_ROLE_IDS } from '@/lib/las-ranks';
import { COMMAND_DEPARTMENTS, LAS_MEMBER_ROLE_ID, canOpenDepartment } from '@/lib/departments';

/** Can this person open the LAS command suite (/dashboard/command/las)? LAS Gold Command, Met Gold, management, developers. */
export const canLasCommand = (u: Pick<PortalUser, 'roles' | 'isManagement'>) =>
  canOpenDepartment(u.roles, u.isManagement, COMMAND_DEPARTMENTS.las);

/** Anyone in LAS (member role) or anyone who can run LAS command can open the LAS portal. */
export async function getLasMember(): Promise<PortalUser | null> {
  const u = await getPortalUser();
  if (!u) return null;
  // Anyone holding an LAS rank role (lib/las-ranks.ts) counts as LAS staff, so no extra Vercel variable is needed.
  const isMember = (!!LAS_MEMBER_ROLE_ID && u.roles.includes(LAS_MEMBER_ROLE_ID)) || u.roles.some((r) => LAS_RANK_ROLE_IDS.includes(r));
  return isMember || canLasCommand(u) ? u : null;
}
