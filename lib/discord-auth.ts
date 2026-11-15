import { NextResponse } from 'next/server';
import { SESSION_MAX_AGE, signSession, verifySession } from '@/lib/session-token';

/**
 * One source of truth for the Discord login flow.
 * The authorize step and the token-exchange step MUST send the identical redirect_uri,
 * otherwise Discord rejects the login (this was the "works on one device/place but not
 * another" failure: the callback used an env var with no fallback, the start route had one).
 */
export const DEFAULT_REDIRECT_URI = 'https://centraloperationsportal.com/api/auth/discord/callback';

export function getRedirectUri(): string {
  return (process.env.DISCORD_REDIRECT_URI || DEFAULT_REDIRECT_URI).trim();
}

/** Canonical site origin (taken from the redirect URI), so we never redirect to an internal/proxy host. */
export function getSiteOrigin(): string {
  return new URL(getRedirectUri()).origin;
}

export function siteUrl(path: string): URL {
  return new URL(path, getSiteOrigin());
}

export { SESSION_MAX_AGE };

// New name on purpose: old unsigned `discord_user` cookies are ignored (and cleared on next login),
// and can't shadow the new cookie now that it is shared between www and the bare domain.
export const SESSION_COOKIE = 'cop_session';
export const LEGACY_SESSION_COOKIE = 'discord_user';

/**
 * Share the cookie between centraloperationsportal.com and www.centraloperationsportal.com.
 * Login always completes on the bare domain, but the Discord embeds link to www – with a host-only
 * cookie that looked like being logged out.
 */
function cookieDomain(): string | undefined {
  if (process.env.NODE_ENV !== 'production') return undefined;
  const host = new URL(getRedirectUri()).hostname;
  if (host === 'localhost' || /^[\d.]+$/.test(host) || host.endsWith('.vercel.app')) return undefined;
  return host.replace(/^www\./, '');
}

export function setSessionCookie(res: NextResponse, value: object) {
  const token = signSession(value);
  // Browsers silently drop cookies over ~4KB, which looks like a login loop. Warn loudly in the logs.
  if (token.length > 3500) {
    console.error('Session cookie is close to / over the 4KB browser limit:', token.length);
  }
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // survives the redirect back from discord.com on every browser / device
    path: '/',
    maxAge: SESSION_MAX_AGE,
    domain: cookieDomain(),
  });
  res.cookies.delete(LEGACY_SESSION_COOKIE); // drop the old forgeable cookie
}

/** Retry on Discord rate limits / transient 5xx so a login never fails just because of a blip. */
export async function fetchWithRetry(url: string, init: RequestInit, attempts = 3): Promise<Response> {
  let last: Response | null = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { ...init, cache: 'no-store' });
      if (res.status !== 429 && res.status < 500) return res;
      last = res;
      const retryAfter = Number(res.headers.get('retry-after'));
      await new Promise((r) => setTimeout(r, Math.min(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 400 * (i + 1), 3000)));
    } catch (err) {
      if (i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  return last as Response;
}

/** Verifies the signature + expiry. Never throws, returns null if missing / tampered / expired. */
export function parseSessionCookie(raw: string | undefined | null): DiscordSessionUser | null {
  return verifySession<DiscordSessionUser>(raw);
}

/** Where to send people after login. Only these paths are allowed (no open redirects). */
export const ALLOWED_NEXT = ['/appeal'];
export const NEXT_COOKIE = 'login_next';
