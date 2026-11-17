import { LAS_GOLD_ROLE_ID } from '@/lib/training-config';
import { parseNick } from '@/lib/met-discord';
import { lasRankFromRoles } from '@/lib/las-ranks';

const API = 'https://discord.com/api/v10';

export interface LasRosterRow {
  id: string;
  name: string;
  callsign: string | null; // number from the Discord nickname, e.g. "[2041] Jane Smith"
  rank: string | null;
  rankLevel: number;
  tier: string;
  tierLevel: number;
}

// Who is listed. A person appears once, under the most senior role they hold.
// LAS Gold Command is built in. Add more tiers in Vercel (each is optional): DISCORD_LAS_SILVER_COMMAND_ROLE_ID,
// DISCORD_LAS_BRONZE_COMMAND_ROLE_ID, DISCORD_LAS_COMMAND_ROLE_ID, DISCORD_LAS_MEMBER_ROLE_ID (everyone in LAS).
const TIERS: { label: string; id: string }[] = [
  { label: 'LAS Gold Command', id: LAS_GOLD_ROLE_ID },
  { label: 'LAS Silver Command', id: process.env.DISCORD_LAS_SILVER_COMMAND_ROLE_ID || '' },
  { label: 'LAS Bronze Command', id: process.env.DISCORD_LAS_BRONZE_COMMAND_ROLE_ID || '' },
  { label: 'LAS Command', id: process.env.DISCORD_LAS_COMMAND_ROLE_ID || '' },
  { label: 'LAS Members', id: process.env.DISCORD_LAS_MEMBER_ROLE_ID || '' },
].filter((t) => !!t.id);

// Ranks, most senior first. A Discord role counts as a rank when its name contains one of these. Rename to match your server.
const RANKS: { name: string; level: number }[] = [
  { name: 'Chief Executive', level: 0 },
  { name: 'Executive Director', level: 1 },
  { name: 'Director', level: 2 },
  { name: 'Head of Operations', level: 3 },
  { name: 'Operations Manager', level: 4 },
  { name: 'Duty Manager', level: 5 },
  { name: 'Consultant Paramedic', level: 6 },
  { name: 'Critical Care Paramedic', level: 7 },
  { name: 'Advanced Paramedic', level: 8 },
  { name: 'Team Leader', level: 9 },
  { name: 'Specialist Paramedic', level: 10 },
  { name: 'Senior Paramedic', level: 11 },
  { name: 'Paramedic', level: 12 },
  { name: 'Student Paramedic', level: 13 },
  { name: 'Emergency Medical Technician', level: 14 },
  { name: 'EMT', level: 14 },
  { name: 'Emergency Care Assistant', level: 15 },
  { name: 'ECA', level: 15 },
  { name: 'Ambulance Care Assistant', level: 16 },
  { name: 'Trainee', level: 17 },
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RANK_PATTERNS = RANKS.map((r) => ({ ...r, re: new RegExp(`\\b${escape(r.name)}\\b`, 'i') }));

/** Most senior rank among someone's role names. The longest match wins per role ("Student Paramedic" beats "Paramedic"). */
function rankFromRoleNames(names: string[]): { rank: string; level: number } | null {
  let best: { rank: string; level: number } | null = null;
  for (const n of names) {
    let hit: (typeof RANK_PATTERNS)[number] | null = null;
    for (const r of RANK_PATTERNS) if (r.re.test(n) && (!hit || r.name.length > hit.name.length)) hit = r;
    if (hit && (!best || hit.level < best.level)) best = { rank: hit.name, level: hit.level };
  }
  return best;
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

type RosterResult = { rows: LasRosterRow[]; error: string | null };
let cached: { at: number; value: RosterResult } | null = null;
const CACHE_MS = 30_000; // role changes in Discord show up within about a minute

/** LAS roster, built live from Discord: who is listed comes from the LAS command roles, number from the nickname, rank from rank roles. */
export async function getLasRoster(): Promise<RosterResult> {
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

  const rows: LasRosterRow[] = [];
  for (const m of members) {
    if (!m.user || m.user.bot) continue;
    const roles = m.roles ?? [];
    const tierIndex = TIERS.findIndex((t) => roles.includes(t.id));
    if (tierIndex < 0) continue;
    const nick = parseNick(m.nick);
    // Rank comes from the LAS rank role IDs (lib/las-ranks.ts); role names are only a fallback.
    const rank = lasRankFromRoles(roles) ?? rankFromRoleNames(roles.map((r) => roleName.get(r)).filter(Boolean) as string[]);
    rows.push({
      id: m.user.id,
      name: nick.name || m.user.global_name || m.user.username,
      callsign: nick.collar,
      rank: rank?.rank ?? null,
      rankLevel: rank?.level ?? 99,
      tier: TIERS[tierIndex].label,
      tierLevel: tierIndex,
    });
  }

  rows.sort((a, b) => {
    const ca = a.callsign && /^\d+$/.test(a.callsign) ? parseInt(a.callsign, 10) : Number.MAX_SAFE_INTEGER;
    const cb = b.callsign && /^\d+$/.test(b.callsign) ? parseInt(b.callsign, 10) : Number.MAX_SAFE_INTEGER;
    return a.tierLevel - b.tierLevel || a.rankLevel - b.rankLevel || ca - cb || a.name.localeCompare(b.name);
  });

  const value = { rows, error: null };
  cached = { at: Date.now(), value };
  return value;
}
