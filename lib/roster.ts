import { MANAGEMENT_ROLE_IDS, supabaseAdmin } from '@/lib/portal';
import { BRONZE_ROLE_ID, DEV_ROLE_ID, GOLD_ROLE_ID, OWNERSHIP_ROLE_IDS, SILVER_ROLE_ID, STAFF_ROLE_ID, TRAINER_ROLE_ID } from '@/lib/training-config';

const API = 'https://discord.com/api/v10';

export interface RosterMember {
  id: string;
  name: string;
  avatarUrl: string;
  rpName: string | null;
  collar: string | null;
  roleNames: string[];
}
export interface RosterGroup {
  key: string;
  label: string;
  members: RosterMember[];
}

// A person is listed once, under the first group they match (top = most senior).
const GROUPS: { key: string; label: string; ids: string[] }[] = [
  { key: 'ownership', label: 'Ownership', ids: OWNERSHIP_ROLE_IDS },
  { key: 'management', label: 'Management', ids: MANAGEMENT_ROLE_IDS.filter((r) => !OWNERSHIP_ROLE_IDS.includes(r)) },
  { key: 'gold', label: 'Gold Command', ids: [GOLD_ROLE_ID] },
  { key: 'silver', label: 'Silver Command', ids: [SILVER_ROLE_ID] },
  { key: 'bronze', label: 'Bronze Command', ids: [BRONZE_ROLE_ID] },
  { key: 'staff', label: 'Staff', ids: [STAFF_ROLE_ID] },
  { key: 'trainers', label: 'Trainers', ids: [TRAINER_ROLE_ID] },
  { key: 'developers', label: 'Developers', ids: [DEV_ROLE_ID] },
].map((g) => ({ ...g, ids: g.ids.filter(Boolean) }));

interface RawMember {
  nick?: string | null;
  roles?: string[];
  user?: { id: string; username: string; global_name?: string | null; avatar?: string | null; bot?: boolean };
}

async function discord<T>(path: string): Promise<{ ok: boolean; status: number; data: T | null }> {
  try {
    const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }, cache: 'no-store' });
    return { ok: res.ok, status: res.status, data: res.ok ? ((await res.json()) as T) : null };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

export async function getRoster(): Promise<{ groups: RosterGroup[]; total: number; error: string | null }> {
  const guild = process.env.DISCORD_GUILD_ID;
  if (!process.env.DISCORD_BOT_TOKEN || !guild) return { groups: [], total: 0, error: 'DISCORD_BOT_TOKEN / DISCORD_GUILD_ID are not set.' };

  const rolesRes = await discord<{ id: string; name: string; position: number }[]>(`/guilds/${guild}/roles`);
  const roleName = new Map((rolesRes.data ?? []).map((r) => [r.id, r.name]));
  const rolePos = new Map((rolesRes.data ?? []).map((r) => [r.id, r.position]));

  // Members come in pages of 1000. This needs the "Server Members Intent" switched on for the bot.
  const members: RawMember[] = [];
  let after = '0';
  for (let page = 0; page < 10; page++) {
    const r = await discord<RawMember[]>(`/guilds/${guild}/members?limit=1000&after=${after}`);
    if (!r.ok || !r.data) {
      if (page === 0) {
        return {
          groups: [],
          total: 0,
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

  // RP name / collar number from the whitelist table (silently skipped if unavailable)
  const rp = new Map<string, { rp_name: string | null; collar_number: string | null }>();
  try {
    const { data } = await supabaseAdmin.from('user_whitelists').select('discord_id, rp_name, collar_number').limit(5000);
    for (const w of data ?? []) rp.set(String(w.discord_id), { rp_name: w.rp_name ?? null, collar_number: w.collar_number != null ? String(w.collar_number) : null });
  } catch {}

  const groups: RosterGroup[] = GROUPS.map((g) => ({ key: g.key, label: g.label, members: [] }));
  for (const m of members) {
    if (!m.user || m.user.bot) continue;
    const roles = m.roles ?? [];
    const gi = GROUPS.findIndex((g) => g.ids.some((id) => roles.includes(id)));
    if (gi < 0) continue;
    const w = rp.get(m.user.id);
    groups[gi].members.push({
      id: m.user.id,
      name: m.nick || m.user.global_name || m.user.username,
      avatarUrl: m.user.avatar ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png?size=64` : 'https://cdn.discordapp.com/embed/avatars/0.png',
      rpName: w?.rp_name ?? null,
      collar: w?.collar_number ?? null,
      roleNames: roles
        .filter((r) => roleName.has(r))
        .sort((a, b) => (rolePos.get(b) ?? 0) - (rolePos.get(a) ?? 0))
        .slice(0, 3)
        .map((r) => roleName.get(r)!),
    });
  }
  for (const g of groups) g.members.sort((a, b) => a.name.localeCompare(b.name));
  return { groups, total: members.filter((m) => !m.user?.bot).length, error: null };
}
