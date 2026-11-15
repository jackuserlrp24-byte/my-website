import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { BRONZE_ROLE_ID, GOLD_ROLE_ID, SILVER_ROLE_ID, hasCommandAccess, hasRoleId, isTrainerRoles } from '@/lib/training-config';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const PORTAL_URL = 'https://www.centraloperationsportal.com';

const MASTER_ROLE_ID = '1497557905275224149';
const MANAGEMENT_ROLE_ALT = '1497557905275224148';

export const MANAGEMENT_ROLE_IDS = [MASTER_ROLE_ID, MANAGEMENT_ROLE_ALT];

/** Founder + developer roles: the only people who can open the Developer panel and who bypass maintenance mode. */
export const DEVELOPER_ROLE_IDS = (process.env.DISCORD_DEVELOPER_ROLE_IDS || '1497557905275224151,1497557905275224148,1497557905250193506')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/** Gold command (or management) approves role requests. */
export const canReviewRoleRequests = (roles: string[]) =>
  hasRoleId(roles, GOLD_ROLE_ID) || MANAGEMENT_ROLE_IDS.some((r) => roles.includes(r));

export interface PortalUser {
  id: string;
  name: string;
  isManagement: boolean;
  isDeveloper: boolean; // founder / developer - Developer panel + bypasses maintenance mode
  isCommand: boolean; // can see the Command tab and edit division application links
  isTrainer: boolean; // can open the trainer panel and post trainings (trainer role, bronze/silver/gold, management)
  canRequestRoles: boolean; // trainer role, gold, management
  canReviewRoleRequests: boolean; // gold, management
  canViewApplications: boolean; // silver, gold, management
  canStaff: boolean; // staff panel: notes + warnings (silver, gold, management)
  canModerate: boolean; // staff panel: kick / ban / unban (gold, management)
  roles: string[];
}

/**
 * Resolves the logged-in user from the discord_user cookie and re-checks
 * their live server membership + roles with the bot. Returns null if they
 * are logged out or not in the server.
 */
export async function getPortalUser(): Promise<PortalUser | null> {
  const raw = (await cookies()).get('discord_user')?.value;
  if (!raw) return null;

  let id: unknown;
  try {
    id = JSON.parse(raw)?.id;
  } catch {
    return null;
  }
  if (typeof id !== 'string' || !id) return null;

  const token = process.env.DISCORD_BOT_TOKEN;
  const guild = process.env.DISCORD_GUILD_ID;
  if (!token || !guild) return null;

  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guild}/members/${id}`, {
      headers: { Authorization: `Bot ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;

    const member = await res.json();
    const roles: string[] = Array.isArray(member.roles) ? member.roles : [];

    const isManagement = roles.includes(MASTER_ROLE_ID) || roles.includes(MANAGEMENT_ROLE_ALT);

    return {
      id,
      name: member.nick || member.user?.global_name || member.user?.username || 'Unknown',
      isManagement,
      isDeveloper: roles.some((r) => DEVELOPER_ROLE_IDS.includes(r)),
      isCommand: hasCommandAccess(roles),
      isTrainer:
        isManagement ||
        isTrainerRoles(roles) ||
        hasRoleId(roles, GOLD_ROLE_ID) ||
        hasRoleId(roles, SILVER_ROLE_ID) ||
        hasRoleId(roles, BRONZE_ROLE_ID),
      canRequestRoles: isManagement || isTrainerRoles(roles) || hasRoleId(roles, GOLD_ROLE_ID),
      canReviewRoleRequests: canReviewRoleRequests(roles),
      canStaff: isManagement || hasRoleId(roles, GOLD_ROLE_ID) || hasRoleId(roles, SILVER_ROLE_ID),
      canModerate: isManagement || hasRoleId(roles, GOLD_ROLE_ID),
      canViewApplications:
        isManagement || hasRoleId(roles, GOLD_ROLE_ID) || hasRoleId(roles, SILVER_ROLE_ID),
      roles,
    };
  } catch (err) {
    console.error('getPortalUser failed:', err);
    return null;
  }
}
