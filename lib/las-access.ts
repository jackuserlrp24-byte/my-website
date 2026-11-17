import { getPortalUser, type PortalUser } from '@/lib/portal';
import { COMMAND_DEPARTMENTS, LAS_MEMBER_ROLE_ID, canOpenDepartment } from '@/lib/departments';

/** Can this person open the LAS command suite (/dashboard/command/las)? LAS Gold Command, Met Gold, management, developers. */
export const canLasCommand = (u: Pick<PortalUser, 'roles' | 'isManagement'>) =>
  canOpenDepartment(u.roles, u.isManagement, COMMAND_DEPARTMENTS.las);

/** Anyone in LAS (member role) or anyone who can run LAS command can open the LAS portal. */
export async function getLasMember(): Promise<PortalUser | null> {
  const u = await getPortalUser();
  if (!u) return null;
  const isMember = !!LAS_MEMBER_ROLE_ID && u.roles.includes(LAS_MEMBER_ROLE_ID);
  return isMember || canLasCommand(u) ? u : null;
}
