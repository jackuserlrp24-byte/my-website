import { cache } from 'react';

/**
 * One place that asks Discord "is this person in the server, and what roles do they have?".
 *
 * Before this, every dashboard page made its own uncached call, so a few clicks could trip Discord's
 * rate limit. Any non-OK answer (429, 5xx, network blip) was then treated as "not in the server",
 * which looked like being signed out – and a 404 even deleted the person's whitelist row.
 *
 * Now:
 *  - results are cached for 60s (and de-duplicated while in flight),
 *  - 429 / 5xx / network errors are retried, and if Discord is still unhappy we fall back to the last
 *    known good answer (up to 10 min old) instead of kicking the user out,
 *  - only Discord's explicit "Unknown Member" answer means "not in the server".
 */
export interface GuildMember {
  roles?: string[];
  nick?: string | null;
  user?: { id?: string; username?: string; global_name?: string | null; avatar?: string | null };
}

export type MemberResult =
  | { status: 'ok'; member: GuildMember; stale?: boolean }
  | { status: 'not_member' }
  | { status: 'error' } // Discord is unreachable / rate limiting / the bot is misconfigured: do NOT treat as "left the server"
  | { status: 'unconfigured' }; // bot token or guild id missing

const FRESH_MS = 60_000;
const STALE_OK_MS = 10 * 60_000;
const UNKNOWN_MEMBER_CODES = new Set([10007, 10013]); // Unknown Member, Unknown User

const good = new Map<string, { at: number; member: GuildMember }>();
const inflight = new Map<string, Promise<MemberResult>>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchFromDiscord(userId: string, guild: string, token: string): Promise<MemberResult> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`https://discord.com/api/v10/guilds/${guild}/members/${userId}`, {
        headers: { Authorization: `Bot ${token}` },
        cache: 'no-store',
      });

      if (res.ok) {
        const member = (await res.json()) as GuildMember;
        good.set(userId, { at: Date.now(), member });
        return { status: 'ok', member };
      }

      if (res.status === 404) {
        const body = await res.json().catch(() => null);
        if (body && UNKNOWN_MEMBER_CODES.has(body.code)) {
          good.delete(userId);
          return { status: 'not_member' };
        }
        // Any other 404 (e.g. Unknown Guild = wrong DISCORD_GUILD_ID) is a config problem, not "user left".
        console.error('Discord member lookup 404 that is not Unknown Member:', body);
        return { status: 'error' };
      }

      if (res.status === 429 || res.status >= 500) {
        const retryAfter = Number(res.headers.get('retry-after'));
        await sleep(Math.min(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 400 * (attempt + 1), 2000));
        continue;
      }

      console.error('Discord member lookup failed:', res.status); // 401/403: bad bot token or missing intent
      return { status: 'error' };
    } catch (err) {
      console.error('Discord member lookup error:', err);
      await sleep(300 * (attempt + 1));
    }
  }
  return { status: 'error' };
}

async function lookup(userId: string): Promise<MemberResult> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const guild = process.env.DISCORD_GUILD_ID || process.env.DISCORD_SERVER_ID;
  if (!token || !guild) {
    console.error('DISCORD_BOT_TOKEN / DISCORD_GUILD_ID are not set – denying access.');
    return { status: 'unconfigured' };
  }
  if (!/^\d{5,25}$/.test(userId)) return { status: 'not_member' };

  const hit = good.get(userId);
  if (hit && Date.now() - hit.at < FRESH_MS) return { status: 'ok', member: hit.member };

  let pending = inflight.get(userId);
  if (!pending) {
    pending = fetchFromDiscord(userId, guild, token).finally(() => inflight.delete(userId));
    inflight.set(userId, pending);
  }
  const result = await pending;

  if (result.status === 'error' && hit && Date.now() - hit.at < STALE_OK_MS) {
    return { status: 'ok', member: hit.member, stale: true };
  }
  return result;
}

/** Also memoised per request, so a layout and its page share one lookup. */
export const getGuildMember = cache(lookup);
