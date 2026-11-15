import { cookies } from 'next/headers';
import { SESSION_COOKIE, parseSessionCookie } from '@/lib/discord-auth';

export function getDiscordDisplayName(user: DiscordSessionUser): string {
  return user.nickname || user.global_name || user.username || user.name || '';
}

/** The logged-in user from the signed session cookie, or null if logged out / tampered / expired. */
export async function getDiscordSession(): Promise<DiscordSessionUser | null> {
  const cookieStore = await cookies();
  return parseSessionCookie(cookieStore.get(SESSION_COOKIE)?.value);
}
