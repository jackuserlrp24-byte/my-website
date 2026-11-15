import { LOG_CHANNEL_ID } from '@/lib/training-config';

const API = 'https://discord.com/api/v10';

// Channel IDs. Set these in your env to post somewhere other than the patrols channel.
const FALLBACK_CHANNEL = '1532786346920247398';
export const TRAININGS_CHANNEL_ID = process.env.DISCORD_TRAININGS_CHANNEL_ID || FALLBACK_CHANNEL;
// The Division Application Status message lives here. (Own variable name so an old DISCORD_DIVISIONS_CHANNEL_ID on your host can't override it.)
export const DIVISIONS_CHANNEL_ID = process.env.PORTAL_DIVISIONS_CHANNEL_ID || '1571517865406763149';
// Every log goes to the one log channel (see LOG_CHANNEL_ID in lib/training-config.ts).
export const APPLICATIONS_LOG_CHANNEL_ID = LOG_CHANNEL_ID;
export const APPEAL_LOG_CHANNEL_ID = LOG_CHANNEL_ID;
export const applicationsLogChannel = (_department?: string | null) => LOG_CHANNEL_ID;

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
  color = 5793266,
  channelId: string = APPLICATIONS_LOG_CHANNEL_ID
) {
  await postMessage(channelId, {
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

/** Reads a member's raw server nickname (null = none). Returns undefined if they are not in the server. */
export async function getMemberNick(userId: string): Promise<string | null | undefined> {
  const guild = process.env.DISCORD_GUILD_ID;
  if (!process.env.DISCORD_BOT_TOKEN || !guild) return undefined;
  try {
    const res = await fetch(`${API}/guilds/${guild}/members/${userId}`, { headers: headers(), cache: 'no-store' });
    if (!res.ok) return undefined;
    const m = await res.json();
    return (m.nick as string | null) ?? null;
  } catch {
    return undefined;
  }
}

/** Sets (or clears with null) a member's server nickname. Needs the Manage Nicknames permission; can't touch the server owner or higher roles. */
export async function setMemberNickname(userId: string, nick: string | null): Promise<boolean> {
  const guild = process.env.DISCORD_GUILD_ID;
  if (!process.env.DISCORD_BOT_TOKEN || !guild) return false;
  try {
    const res = await fetch(`${API}/guilds/${guild}/members/${userId}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ nick }),
    });
    if (!res.ok) console.error('Nickname change failed:', res.status, await res.text());
    return res.ok;
  } catch {
    return false;
  }
}

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


/** The Discord server ban for a user (null if they are not banned there). */
export async function getGuildBan(userId: string): Promise<{ reason: string | null } | null> {
  const guild = process.env.DISCORD_GUILD_ID;
  if (!process.env.DISCORD_BOT_TOKEN || !guild) return null;
  try {
    const res = await fetch(`${API}/guilds/${guild}/bans/${userId}`, { headers: headers(), cache: 'no-store' });
    if (!res.ok) return null;
    const b = await res.json();
    return { reason: b.reason ?? null };
  } catch {
    return null;
  }
}

/** Creates a text channel only the listed roles + the bot can see. */
export async function createPrivateChannel(opts: {
  name: string;
  topic?: string;
  parentId?: string;
  staffRoleIds: string[];
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const guild = process.env.DISCORD_GUILD_ID;
  const botId = process.env.DISCORD_CLIENT_ID; // a bot's user id is its application id
  if (!process.env.DISCORD_BOT_TOKEN || !guild) return { ok: false, error: 'Bot token / guild id not configured.' };

  const VIEW = 1024, SEND = 2048, EMBED = 16384, ATTACH = 32768, HISTORY = 65536;
  const allow = String(VIEW | SEND | EMBED | ATTACH | HISTORY);

  const overwrites = [
    { id: guild, type: 0, allow: '0', deny: String(VIEW) }, // @everyone cannot see it
    ...(botId ? [{ id: botId, type: 1, allow, deny: '0' }] : []),
    ...Array.from(new Set(staffRoleIdsClean(opts.staffRoleIds))).map((id) => ({ id, type: 0, allow, deny: '0' })),
  ];

  try {
    const res = await fetch(`${API}/guilds/${guild}/channels`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        name: opts.name.slice(0, 100),
        type: 0,
        topic: opts.topic?.slice(0, 1000),
        ...(opts.parentId ? { parent_id: opts.parentId } : {}),
        permission_overwrites: overwrites,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('createPrivateChannel failed:', res.status, text);
      return {
        ok: false,
        error:
          res.status === 403
            ? 'The bot needs the Manage Channels permission.'
            : `Discord refused to create the ticket channel (${res.status}).`,
      };
    }
    return { ok: true, id: (await res.json()).id as string };
  } catch (err) {
    console.error('createPrivateChannel error:', err);
    return { ok: false, error: 'Could not reach Discord.' };
  }
}

const staffRoleIdsClean = (ids: string[]) => ids.filter((i) => /^\d{17,20}$/.test(i));


// ---- Rejoin invites (sent when someone is unbanned) ----

/**
 * Creates a fresh single-use invite that expires in 7 days.
 * Channel used: DISCORD_INVITE_CHANNEL_ID, else the server's rules / system channel, else the first text channel.
 * Falls back to DISCORD_INVITE_URL (a permanent invite you set in env) if the bot cannot create one.
 * The bot needs the "Create Invite" permission.
 */
export async function createRejoinInvite(): Promise<string | null> {
  const guild = process.env.DISCORD_GUILD_ID;
  const fallback = process.env.DISCORD_INVITE_URL || null;
  if (!process.env.DISCORD_BOT_TOKEN || !guild) return fallback;

  try {
    let channelId = process.env.DISCORD_INVITE_CHANNEL_ID || '';

    if (!channelId) {
      const g = await fetch(`${API}/guilds/${guild}`, { headers: headers(), cache: 'no-store' });
      if (g.ok) {
        const info = await g.json();
        channelId = info.rules_channel_id || info.system_channel_id || '';
      }
    }
    if (!channelId) {
      const list = await fetch(`${API}/guilds/${guild}/channels`, { headers: headers(), cache: 'no-store' });
      if (list.ok) {
        const chans = (await list.json()) as { id: string; type: number; position: number }[];
        channelId = chans.filter((c) => c.type === 0).sort((a, b) => a.position - b.position)[0]?.id ?? '';
      }
    }
    if (!channelId) return fallback;

    const res = await fetch(`${API}/channels/${channelId}/invites`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ max_age: 7 * 24 * 3600, max_uses: 1, unique: true, temporary: false }),
    });
    if (!res.ok) {
      console.error('createRejoinInvite failed:', res.status, await res.text());
      return fallback;
    }
    const { code } = (await res.json()) as { code: string };
    return `https://discord.gg/${code}`;
  } catch (err) {
    console.error('createRejoinInvite error:', err);
    return fallback;
  }
}

/**
 * DMs a player that they were unbanned, with a brand-new invite link if they are not currently in the server.
 * DMs can fail (closed DMs, or no shared server while banned) - callers should also show the link somewhere else.
 */
export async function sendUnbanNotice(
  userId: string,
  opts: { title: string; description: string; note?: string }
): Promise<{ dmSent: boolean; inviteUrl: string | null }> {
  const alreadyInServer = !!(await getGuildMember(userId));
  const inviteUrl = alreadyInServer ? null : await createRejoinInvite();

  const dmSent = await sendDm(userId, {
    embeds: [
      {
        title: opts.title,
        description: inviteUrl
          ? `${opts.description}\n\nUse the button below (or this link) to rejoin the server:\n${inviteUrl}\n*Single-use link - it expires in 7 days.*`
          : alreadyInServer
          ? `${opts.description}\n\nYou are still in the Discord server, so no new invite is needed.`
          : opts.description,
        color: 5763719,
        fields: opts.note ? [{ name: 'Staff note', value: opts.note.slice(0, 1000) }] : [],
        footer: { text: 'Central Operations' },
        timestamp: new Date().toISOString(),
      },
    ],
    ...(inviteUrl ? { components: [{ type: 1, components: [{ type: 2, style: 5, label: 'Rejoin the server', url: inviteUrl }] }] } : {}),
  });

  return { dmSent, inviteUrl };
}
