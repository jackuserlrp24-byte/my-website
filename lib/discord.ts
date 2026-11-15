const API = 'https://discord.com/api/v10';

// Channel IDs. Set these in your env to post somewhere other than the patrols channel.
const FALLBACK_CHANNEL = '1532786346920247398';
export const TRAININGS_CHANNEL_ID = process.env.DISCORD_TRAININGS_CHANNEL_ID || FALLBACK_CHANNEL;
export const DIVISIONS_CHANNEL_ID = process.env.DISCORD_DIVISIONS_CHANNEL_ID || FALLBACK_CHANNEL;
export const APPLICATIONS_LOG_CHANNEL_ID =
  process.env.DISCORD_APPLICATIONS_LOG_CHANNEL_ID || '1564285919564136711';

function headers() {
  return {
    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

export async function postMessage(channelId: string, payload: object): Promise<string | null> {
  if (!process.env.DISCORD_BOT_TOKEN) return null;
  try {
    const res = await fetch(`${API}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error('Discord post failed:', res.status, await res.text());
      return null;
    }
    return (await res.json()).id as string;
  } catch (err) {
    console.error('Discord post error:', err);
    return null;
  }
}

export async function editMessage(channelId: string, messageId: string, payload: object): Promise<boolean> {
  if (!process.env.DISCORD_BOT_TOKEN) return false;
  try {
    const res = await fetch(`${API}/channels/${channelId}/messages/${messageId}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteMessage(channelId: string, messageId: string): Promise<void> {
  if (!process.env.DISCORD_BOT_TOKEN) return;
  await fetch(`${API}/channels/${channelId}/messages/${messageId}`, {
    method: 'DELETE',
    headers: headers(),
  }).catch(() => {});
}

export async function logEmbed(
  title: string,
  description: string,
  fields: { name: string; value: string; inline?: boolean }[],
  color = 5793266
) {
  await postMessage(APPLICATIONS_LOG_CHANNEL_ID, {
    embeds: [{ title, description, color, fields, timestamp: new Date().toISOString() }],
    allowed_mentions: { parse: [] },
  });
}

/** Sends a DM. Returns false if the user has DMs closed or the call fails. */
export async function sendDm(userId: string, payload: object): Promise<boolean> {
  if (!process.env.DISCORD_BOT_TOKEN) return false;
  try {
    const ch = await fetch(`${API}/users/@me/channels`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ recipient_id: userId }),
    });
    if (!ch.ok) return false;
    const { id } = await ch.json();
    const res = await fetch(`${API}/channels/${id}/messages`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function addGuildRole(userId: string, roleId: string): Promise<boolean> {
  const guild = process.env.DISCORD_GUILD_ID;
  if (!process.env.DISCORD_BOT_TOKEN || !guild) return false;
  try {
    const res = await fetch(`${API}/guilds/${guild}/members/${userId}/roles/${roleId}`, {
      method: 'PUT',
      headers: headers(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ---- Moderation helpers (staff panel) ----
type ModResult = { ok: boolean; status: number };

async function modCall(method: string, path: string, reason: string, body?: object): Promise<ModResult> {
  const guild = process.env.DISCORD_GUILD_ID;
  if (!process.env.DISCORD_BOT_TOKEN || !guild) return { ok: false, status: 0 };
  try {
    const res = await fetch(`${API}/guilds/${guild}${path}`, {
      method,
      headers: { ...headers(), 'X-Audit-Log-Reason': encodeURIComponent(reason).slice(0, 500) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

export const kickMember = (userId: string, reason: string) => modCall('DELETE', `/members/${userId}`, reason);
export const banMember = (userId: string, reason: string) =>
  modCall('PUT', `/bans/${userId}`, reason, { delete_message_seconds: 0 });
export const unbanMember = (userId: string, reason: string) => modCall('DELETE', `/bans/${userId}`, reason);

export interface GuildMemberLite {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  roles: string[];
}

function toLite(m: { nick?: string; roles?: string[]; user?: { id: string; username: string; global_name?: string; avatar?: string } }): GuildMemberLite | null {
  if (!m.user) return null;
  return {
    id: m.user.id,
    name: m.nick || m.user.global_name || m.user.username,
    username: m.user.username,
    avatarUrl: m.user.avatar
      ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png?size=64`
      : 'https://cdn.discordapp.com/embed/avatars/0.png',
    roles: Array.isArray(m.roles) ? m.roles : [],
  };
}

export async function getGuildMember(userId: string): Promise<GuildMemberLite | null> {
  const guild = process.env.DISCORD_GUILD_ID;
  if (!process.env.DISCORD_BOT_TOKEN || !guild) return null;
  try {
    const res = await fetch(`${API}/guilds/${guild}/members/${userId}`, { headers: headers(), cache: 'no-store' });
    return res.ok ? toLite(await res.json()) : null;
  } catch {
    return null;
  }
}

export async function searchGuildMembers(query: string): Promise<GuildMemberLite[]> {
  const guild = process.env.DISCORD_GUILD_ID;
  if (!process.env.DISCORD_BOT_TOKEN || !guild) return [];
  try {
    const res = await fetch(`${API}/guilds/${guild}/members/search?query=${encodeURIComponent(query)}&limit=8`, {
      headers: headers(),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const list = (await res.json()) as Parameters<typeof toLite>[0][];
    return list.map(toLite).filter((m): m is GuildMemberLite => !!m);
  } catch {
    return [];
  }
}
