import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const TARGET_CHANNEL_ID = '1532786346920247398';

async function fetchDiscordMemberInfo(userId: string) {
  if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID || !userId) return null;
  try {
    const [memberRes, rolesRes] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${userId}`, {
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
        next: { revalidate: 60 }
      }),
      fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/roles`, {
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
        next: { revalidate: 3600 }
      })
    ]);

    if (!memberRes.ok || !rolesRes.ok) return null;

    const member = await memberRes.json();
    const guildRoles = await rolesRes.json();

    const roleMap = new Map();
    guildRoles.forEach((r: { id: string; name: string; color: number }) => roleMap.set(r.id, { name: r.name, color: r.color }));

    const resolvedRoles = (member.roles || []).map((id: string) => {
      const r = roleMap.get(id);
      return r ? { id, name: r.name, color: r.color !== 0 ? `#${r.color.toString(16).padStart(6, '0')}` : '#a3a3a3' } : null;
    }).filter(Boolean);

    return {
      nickname: member.nick || null,
      username: member.user?.username || 'Unknown',
      avatar: member.user?.avatar ? `https://cdn.discordapp.com/avatars/${userId}/${member.user.avatar}.png` : null,
      joinedAt: member.joined_at || null,
      roles: resolvedRoles
    };
  } catch {
    return null;
  }
}


export async function loadManagementData(modSearchQuery: string) {
  let notices: any[] = [];
  let moderationLogs: any[] = [];
  let patrols: any[] = [];
  let allWhitelistedUsers: any[] = [];

  try {
    let modQuery = supabase.from('moderation_logs').select('*').order('created_at', { ascending: false });
    if (modSearchQuery) {
      modQuery = modQuery.or(`discord_id.ilike.%${modSearchQuery}%,username.ilike.%${modSearchQuery}%`);
    }

    const [noticesRes, moderationRes, patrolsRes, whitelistsRes] = await Promise.all([
      supabase.from('community_notices').select('*').order('created_at', { ascending: false }).limit(10),
      modQuery.limit(20),
      supabase.from('patrols').select('*').order('created_at', { ascending: false }).limit(15),
      supabase.from('user_whitelists').select('*').order('collar_number', { ascending: true }).limit(200),
    ]);

    notices = noticesRes.data || [];
    moderationLogs = moderationRes.data || [];
    patrols = patrolsRes.data || [];

    const rawWhitelists = whitelistsRes.data || [];
    allWhitelistedUsers = await Promise.all(
      rawWhitelists.map(async (w) => {
        const discordInfo = await fetchDiscordMemberInfo(w.discord_id);
        const userLogs = moderationLogs.filter((m) => m.discord_id === w.discord_id);
        return { ...w, discord: discordInfo, moderation: userLogs };
      })
    );
  } catch (err) {
    console.error('Management data query error:', err);
  }

  return { notices, moderationLogs, patrols, allUsers: allWhitelistedUsers };
}
