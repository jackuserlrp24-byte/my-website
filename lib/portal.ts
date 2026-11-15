import { cache } from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { BRONZE_ROLE_ID, DEV_ROLE_ID, GOLD_ROLE_ID, OWNERSHIP_ROLE_IDS, SILVER_ROLE_ID, STAFF_ROLE_ID, hasCommandAccess, hasRoleId, isTrainerRoles } from '@/lib/training-config';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const PORTAL_URL = 'https://www.centraloperationsportal.com';

const MASTER_ROLE_ID = '1497557905275224149';
const MANAGEMENT_ROLE_ALT = '1497557905275224148';

/** Management + Ownership: full access, and they can log in with no whitelist / RP account. */
export const MANAGEMENT_ROLE_IDS = [MASTER_ROLE_ID, MANAGEMENT_ROLE_ALT, ...OWNERSHIP_ROLE_IDS];

/** Founder + developer roles: the only people who can open the Developer panel and who bypass maintenance mode. */
export const DEVELOPER_ROLE_IDS = Array.from(
  new Set(
    (process.env.DISCORD_DEVELOPER_ROLE_IDS || '1497557905275224151,1497557905275224148')
      .split(',')
      .map((s) => s.trim())
      .concat(DEV_ROLE_ID)
      .filter(Boolean)
  )
);

/** Roles that give normal portal access (trainings, divisions, etc). */
export const WHITELISTED_ROLES = [
  '1533037093306105896',
  '1532781088827507038',
  '1532841715151671436',
  '1534119748416049193',
  '1532781271477129226',
  '1533023231206883338',
  '1533023096922050750',
  '1532828055154720981',
  '1532781330071425104',
  '1546219971359543408'
];

/** Silver + Gold command (or management) approve / deny role requests. */
export const canReviewRoleRequests = (roles: string[]) =>
  hasRoleId(roles, GOLD_ROLE_ID) || hasRoleId(roles, SILVER_ROLE_ID) || MANAGEMENT_ROLE_IDS.some((r) => roles.includes(r));

/**
 * Developer-only / staff-only accounts: people whose ONLY way into the portal is the Developer role or the Staff role.
 * Returns the single section they are allowed to see, or null for everyone else.
 */
export function limitedAccess(roles: string[]): 'developer' | 'staff' | null {
  const hasOther =
    roles.some((r) => WHITELISTED_ROLES.includes(r)) ||
    MANAGEMENT_ROLE_IDS.some((r) => roles.includes(r)) ||
    hasCommandAccess(roles) ||
    isTrainerRoles(roles) ||
    hasRoleId(roles, GOLD_ROLE_ID) ||
    hasRoleId(roles, SILVER_ROLE_ID) ||
    hasRoleId(roles, BRONZE_ROLE_ID);
  if (hasOther) return null;
  if (hasRoleId(roles, DEV_ROLE_ID) || roles.some((r) => DEVELOPER_ROLE_IDS.includes(r))) return 'developer';
  if (hasRoleId(roles, STAFF_ROLE_ID)) return 'staff';
  return null;
}

/** Where a limited user must be sent instead of the general pages (dashboard home, trainings, divisions, patrols). */
export const limitedHome = (kind: 'developer' | 'staff' | null) =>
  kind === 'developer' ? '/dashboard/developer' : kind === 'staff' ? '/dashboard/staff' : null;

export interface PortalUser {
  id: string;
  name: string;
  isManagement: boolean;
  isDeveloper: boolean; // founder / developer - Developer panel + bypasses maintenance mode
  isCommand: boolean; // can see the Command tab and edit division application links
  isTrainer: boolean; // can open the trainer panel and post trainings (trainer role, bronze/silver/gold, management)
  canRequestRoles: boolean; // trainer role, bronze, silver, gold, management
  canReviewRoleRequests: boolean; // silver, gold, management
  canViewApplications: boolean; // silver, gold, management
  canStaff: boolean; // staff panel + ban appeals: notes + warnings (staff role, silver, gold, management)
  canSwapHost: boolean; // gold command + management: change the instructor / host of a training
  canModerate: boolean; // staff panel: kick / ban / unban (gold, management)
  limited: 'developer' | 'staff' | null; // developer-only / staff-only accounts only see their own panel(s)
  roles: string[];
}

/**
 * Resolves the logged-in user from the discord_user cookie and re-checks
 * their live server membership + roles with the bot. Returns null if they
 * are logged out or not in the server.
 */
async function loadPortalUser(): Promise<PortalUser | null> {
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

    const isManagement = MANAGEMENT_ROLE_IDS.some((r) => roles.includes(r));

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
      canRequestRoles:
        isManagement ||
        isTrainerRoles(roles) ||
        hasRoleId(roles, GOLD_ROLE_ID) ||
        hasRoleId(roles, SILVER_ROLE_ID) ||
        hasRoleId(roles, BRONZE_ROLE_ID),
      canReviewRoleRequests: canReviewRoleRequests(roles),
      canStaff:
        isManagement || hasRoleId(roles, GOLD_ROLE_ID) || hasRoleId(roles, SILVER_ROLE_ID) || hasRoleId(roles, STAFF_ROLE_ID),
      canSwapHost: isManagement || hasRoleId(roles, GOLD_ROLE_ID),
      canModerate: isManagement || hasRoleId(roles, GOLD_ROLE_ID),
      canViewApplications:
        isManagement || hasRoleId(roles, GOLD_ROLE_ID) || hasRoleId(roles, SILVER_ROLE_ID),
      limited: limitedAccess(roles),
      roles,
    };
  } catch (err) {
    console.error('getPortalUser failed:', err);
    return null;
  }
}

/** Same lookup, but done once per request - the staff layout and the page under it share one Discord call. */
export const getPortalUser = cache(loadPortalUser);
