import { NextResponse } from 'next/server';

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

export const SESSION_COOKIE = 'discord_user';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, sliding on every login

export function setSessionCookie(res: NextResponse, value: object) {
  res.cookies.set(SESSION_COOKIE, JSON.stringify(value), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // survives the redirect back from discord.com on every browser / device
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
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

/** Safe cookie parse – never throws, returns null if missing/garbled. */
export function parseSessionCookie(raw: string | undefined | null): DiscordSessionUser | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' && typeof v.id === 'string' && v.id ? (v as DiscordSessionUser) : null;
  } catch {
    return null;
  }
}

/** Where to send people after login. Only these paths are allowed (no open redirects). */
export const ALLOWED_NEXT = ['/appeal'];
export const NEXT_COOKIE = 'login_next';
