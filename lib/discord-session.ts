import { cookies } from 'next/headers';

const SESSION_COOKIE_NAMES = ['discord_user', 'user', 'session'] as const;

export function getDiscordDisplayName(user: DiscordSessionUser): string {
  return user.nickname || user.global_name || user.username || user.name || '';
}

function parseSessionValue(value: string): DiscordSessionUser | null {
  try {
    const parsed = JSON.parse(value) as DiscordSessionUser;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function getDiscordSession(): Promise<DiscordSessionUser | null> {
  const cookieStore = await cookies();

  for (const name of SESSION_COOKIE_NAMES) {
    const cookie = cookieStore.get(name);
    if (!cookie?.value) continue;

    const session = parseSessionValue(cookie.value);
    if (session) return session;
  }

  return null;
}
