import { supabaseAdmin } from '@/lib/portal';
import { BRONZE_ROLE_ID, GOLD_ROLE_ID, MET_COMMAND_ROLE_ID, SILVER_ROLE_ID } from '@/lib/training-config';

const API = 'https://discord.com/api/v10';

export interface MetOfficerRow {
  id: string;
  name: string;
  collar: string | null;
  rank: string | null;
  rankLevel: number;
  station: string | null;
  team: string | null;
  tier: string; // which command role they hold
  tierLevel: number;
}

// The roster only lists command. A person is listed once, under the most senior command role they hold.
const TIERS: { label: string; id: string }[] = [
  { label: 'Gold Command', id: GOLD_ROLE_ID },
  { label: 'Silver Command', id: SILVER_ROLE_ID },
  { label: 'Bronze Command', id: BRONZE_ROLE_ID },
  { label: 'Met Command', id: MET_COMMAND_ROLE_ID },
];

// Met ranks, most senior first (lower level = more senior). A Discord role is treated as a rank when its name contains one of
// these words. Add or rename entries here if your server uses different rank names.
const RANKS: { name: string; level: number }[] = [
  { name: 'Commissioner', level: 0 },
  { name: 'Deputy Commissioner', level: 1 },
  { name: 'Assistant Commissioner', level: 2 },
  { name: 'Deputy Assistant Commissioner', level: 3 },
  { name: 'Commander', level: 4 },
  { name: 'Chief Superintendent', level: 5 },
  { name: 'Superintendent', level: 6 },
  { name: 'Chief Inspector', level: 7 },
  { name: 'Inspector', level: 8 },
  { name: 'Sergeant', level: 9 },
  { name: 'Police Constable', level: 10 },
  { name: 'Constable', level: 10 },
  { name: 'Special Constable', level: 11 },
  { name: 'PCSO', level: 12 },
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RANK_PATTERNS = RANKS.map((r) => ({ ...r, re: new RegExp(`\\b${escape(r.name)}\\b`, 'i') }));

/** Of the roles someone holds, the most senior one that looks like a rank. The longest match wins per role ("Chief Inspector" beats "Inspector"). */
function rankFromRoleNames(names: string[]): { rank: string; level: number } | null {
  let best: { rank: string; level: number } | null = null;
  for (const n of names) {
    let hit: (typeof RANK_PATTERNS)[number] | null = null;
    for (const r of RANK_PATTERNS) if (r.re.test(n) && (!hit || r.name.length > hit.name.length)) hit = r;
    if (hit && (!best || hit.level < best.level)) best = { rank: hit.name === 'Constable' ? 'Police Constable' : hit.name, level: hit.level };
  }
  return best;
}

/** The whitelist form sets the Discord nickname to "[collar] RP Name", so the collar number is read from there. */
export function parseNick(nick: string | null | undefined): { collar: string | null; name: string | null } {
  const text = (nick ?? '').trim();
  if (!text) return { collar: null, name: null };
  const bracket = text.match(/^[\[(]\s*([A-Za-z0-9-]{1,12})\s*[\])]\s*[|\-–:]?\s*(.*)$/);
  if (bracket) return { collar: bracket[1], name: bracket[2].trim() || null };
  const plain = text.match(/^(\d{2,6})\s*[|\-–:]\s*(.+)$/);
  if (plain) return { collar: plain[1], name: plain[2].trim() };
  return { collar: null, name: text };
}

interface RawMember {
  nick?: string | null;
  roles?: string[];
  user?: { id: string; username: string; global_name?: string | null; bot?: boolean };
}

async function discord<T>(path: string): Promise<{ ok: boolean; status: number; data: T | null }> {
  try {
    const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }, cache: 'no-store' });
    return { ok: res.ok, status: res.status, data: res.ok ? ((await res.json()) as T) : null };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

type RosterResult = { rows: MetOfficerRow[]; error: string | null };
let cached: { at: number; value: RosterResult } | null = null;
const CACHE_MS = 30_000; // short, so role changes in Discord show up within about a minute

/** Command roster, built live from Discord: who is listed comes from the Gold / Silver / Bronze / Met Command roles, collar number from the nickname, rank from rank roles. Station and team come from My Details. */
export async function getMetRoster(): Promise<RosterResult> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;

  const guild = process.env.DISCORD_GUILD_ID || process.env.DISCORD_SERVER_ID;
  if (!process.env.DISCORD_BOT_TOKEN || !guild) return { rows: [], error: 'DISCORD_BOT_TOKEN / DISCORD_GUILD_ID are not set.' };

  const rolesRes = await discord<{ id: string; name: string }[]>(`/guilds/${guild}/roles`);
  const roleName = new Map((rolesRes.data ?? []).map((r) => [r.id, r.name]));

  const members: RawMember[] = [];
  let after = '0';
  for (let page = 0; page < 10; page++) {
    const r = await discord<RawMember[]>(`/guilds/${guild}/members?limit=1000&after=${after}`);
    if (!r.ok || !r.data) {
      if (page === 0) {
        return {
          rows: [],
          error:
            r.status === 403
              ? 'Discord refused the member list. Turn on "Server Members Intent" for the bot in the Discord Developer Portal (Bot > Privileged Gateway Intents), then reload.'
              : `Could not load the member list from Discord (status ${r.status}).`,
        };
      }
      break;
    }
    members.push(...r.data);
    if (r.data.length < 1000) break;
    after = r.data[r.data.length - 1].user?.id ?? after;
  }

  // Whitelist + command-set details are used as a fallback when Discord has no collar / rank for someone.
  const wl = new Map<string, { rp_name: string | null; collar: string | null }>();
  const details = new Map<string, { rank: string | null; station: string | null; team: string | null }>();
  try {
    const [w, d] = await Promise.all([
      supabaseAdmin.from('user_whitelists').select('discord_id, rp_name, collar_number').limit(5000),
      supabaseAdmin.from('met_officer_details').select('discord_id, rank, station, team').limit(5000),
    ]);
    for (const x of w.data ?? []) wl.set(String(x.discord_id), { rp_name: x.rp_name ?? null, collar: x.collar_number != null ? String(x.collar_number) : null });
    for (const x of d.data ?? []) details.set(String(x.discord_id), { rank: x.rank ?? null, station: x.station ?? null, team: x.team ?? null });
  } catch {}

  const rows: MetOfficerRow[] = [];
  for (const m of members) {
    if (!m.user || m.user.bot) continue;
    const id = m.user.id;
    const roles = m.roles ?? [];
    const tierIndex = TIERS.findIndex((t) => !!t.id && roles.includes(t.id));
    if (tierIndex < 0) continue; // not command

    const nick = parseNick(m.nick);
    const rank = rankFromRoleNames(roles.map((r) => roleName.get(r)).filter(Boolean) as string[]);
    const d = details.get(id);
    rows.push({
      id,
      name: nick.name || wl.get(id)?.rp_name || m.user.global_name || m.user.username,
      collar: nick.collar || wl.get(id)?.collar || null,
      rank: rank?.rank ?? d?.rank ?? null,
      rankLevel: rank?.level ?? 99,
      station: d?.station ?? null,
      team: d?.team ?? null,
      tier: TIERS[tierIndex].label,
      tierLevel: tierIndex,
    });
  }

  rows.sort((a, b) => {
    const ca = a.collar && /^\d+$/.test(a.collar) ? parseInt(a.collar, 10) : Number.MAX_SAFE_INTEGER;
    const cb = b.collar && /^\d+$/.test(b.collar) ? parseInt(b.collar, 10) : Number.MAX_SAFE_INTEGER;
    return a.tierLevel - b.tierLevel || a.rankLevel - b.rankLevel || ca - cb || a.name.localeCompare(b.name);
  });

  const value = { rows, error: null };
  cached = { at: Date.now(), value };
  return value;
}
