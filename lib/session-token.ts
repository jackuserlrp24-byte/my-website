import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Signed session tokens.
 *
 * The session used to be plain JSON in a cookie, so anyone could edit it in their browser and
 * pretend to be another Discord user. Now the payload is signed with HMAC-SHA256: any edit
 * invalidates the signature and the cookie is rejected.
 *
 * Set SESSION_SECRET in your environment (e.g. `openssl rand -base64 32`). Until you do, this
 * falls back to DISCORD_CLIENT_SECRET so the site keeps working, but a dedicated secret is better.
 */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.DISCORD_CLIENT_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set (and no DISCORD_CLIENT_SECRET fallback available)');
  if (!process.env.SESSION_SECRET) {
    console.warn('SESSION_SECRET is not set – falling back to DISCORD_CLIENT_SECRET. Please add a dedicated SESSION_SECRET.');
  }
  return secret;
}

function sign(body: string): Buffer {
  return createHmac('sha256', getSecret()).update(body).digest();
}

export function signSession(payload: object): string {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE })).toString('base64url');
  return `${body}.${sign(body).toString('base64url')}`;
}

/** Returns the payload if the signature is valid and the token has not expired, otherwise null. Never throws. */
export function verifySession<T = DiscordSessionUser>(token: string | undefined | null): T | null {
  if (!token) return null;
  try {
    const dot = token.indexOf('.');
    if (dot < 1) return null;
    const body = token.slice(0, dot);
    const given = Buffer.from(token.slice(dot + 1), 'base64url');
    const expected = sign(body);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload || typeof payload !== 'object') return null;
    if (typeof payload.exp !== 'number' || payload.exp < Date.now() / 1000) return null;
    if (typeof payload.id !== 'string' || !payload.id) return null;
    return payload as T;
  } catch {
    return null;
  }
}
