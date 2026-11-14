import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const PORTAL_URL = 'https://www.centraloperationsportal.com';

const MASTER_ROLE_ID = '1497557905275224149';
const MANAGEMENT_ROLE_ALT = '1497557905275224148';

export interface PortalUser {
  id: string;
  name: string;
  isManagement: boolean;
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

    return {
      id,
      name: member.nick || member.user?.global_name || member.user?.username || 'Unknown',
      isManagement: roles.includes(MASTER_ROLE_ID) || roles.includes(MANAGEMENT_ROLE_ALT),
    };
  } catch (err) {
    console.error('getPortalUser failed:', err);
    return null;
  }
}
