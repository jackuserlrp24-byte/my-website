import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import ManagementClient from './ManagementClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const TARGET_CHANNEL_ID = '1532786346920247398';

// --- SERVER ACTIONS ---

export async function postNotice(formData: FormData) {
  'use server';
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const author = formData.get('author') as string;

  if (!title || !content) return;

  try {
    const { error } = await supabase.from('community_notices').insert([
      { title, content, author_name: author || 'Central Operations Team' }
    ]);

    if (error) {
      console.error('Supabase insert error for notice:', error.message);
    }
  } catch (err) {
    console.error('Failed to post notice:', err);
  }

  revalidatePath('/dashboard/management');
  revalidatePath('/dashboard');
}

export async function editNotice(formData: FormData) {
  'use server';
  const noticeId = formData.get('noticeId') as string;
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  if (!noticeId || !title || !content) return;

  try {
    const { error } = await supabase
      .from('community_notices')
      .update({ title, content })
      .eq('id', noticeId);

    if (error) {
      console.error('Supabase update error for notice:', error.message);
    }
  } catch (err) {
    console.error('Failed to edit notice:', err);
  }

  revalidatePath('/dashboard/management');
  revalidatePath('/dashboard');
}

export async function deleteNotice(formData: FormData) {
  'use server';
  const noticeId = formData.get('noticeId') as string;

  if (!noticeId) return;

  try {
    const { error } = await supabase
      .from('community_notices')
      .delete()
      .eq('id', noticeId);

    if (error) {
      console.error('Supabase delete error for notice:', error.message);
    }
  } catch (err) {
    console.error('Failed to delete notice:', err);
  }

  revalidatePath('/dashboard/management');
  revalidatePath('/dashboard');
}

export async function issueModeration(formData: FormData) {
  'use server';
  const discordId = formData.get('discordId') as string;
  const username = formData.get('username') as string;
  const actionType = formData.get('actionType') as string;
  const reason = formData.get('reason') as string;
  const moderator = formData.get('moderator') as string;

  if (!discordId || !reason) return;

  try {
    await supabase.from('moderation_logs').insert([
      { discord_id: discordId, username: username || 'Unknown', action_type: actionType, reason, moderator_name: moderator || 'Central Operations Team' }
    ]);
  } catch (err) {
    console.error('Failed to log moderation action:', err);
  }

  revalidatePath('/dashboard/management');
}

export async function createManagementPatrol(formData: FormData) {
  'use server';
  const title = formData.get('title') as string;
  const division = formData.get('division') as string;
  const date = formData.get('date') as string;
  const time = formData.get('time') as string;
  const lead = formData.get('lead') as string;
  const description = formData.get('description') as string;
  const creator = formData.get('creator') as string;

  if (!title || !division) return;

  const countRes = await supabase.from('patrols').select('id', { count: 'exact', head: true });
  const nextNum = (countRes.count || 0) + 1;
  const patrolId = `PAT-${nextNum < 10 ? `00${nextNum}` : nextNum < 100 ? `0${nextNum}` : nextNum}`;

  const portalLink = 'https://www.centraloperationsportal.com/dashboard/patrols';
  const embed = {
    title: `New Event : ${title}`,
    description: `${description || 'No additional details provided.'}\n\n**Book Attendance:**\nYou can book on or update your status through the portal here:\n${portalLink}`,
    color: 5793266,
    fields: [
      { name: 'Division', value: division, inline: true },
      { name: 'Shift Lead', value: lead || creator || 'Unassigned', inline: true },
      { name: 'Shift ID', value: patrolId, inline: true },
      { name: 'Date', value: date || 'TBD', inline: true },
      { name: 'Time', value: time || 'TBD', inline: true },
      { name: 'Status', value: 'UPCOMING', inline: true },
      { name: 'Booked On (0)', value: 'No personnel booked on yet.', inline: false },
      { name: 'Not Attending (0)', value: 'No personnel marked absent.', inline: false }
    ],
    footer: {
      text: `Central Operations Portal • Created by ${creator}`
    },
    timestamp: new Date().toISOString()
  };

  let discordMessageId = null;
  if (DISCORD_BOT_TOKEN) {
    const res = await fetch(`https://discord.com/api/v10/channels/${TARGET_CHANNEL_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });
    if (res.ok) {
      const msgData = await res.json();
      discordMessageId = msgData.id;
    }
  }

  await supabase.from('patrols').insert({
    id: patrolId,
    discord_message_id: discordMessageId,
    title,
    division,
    date,
    time,
    lead,
    description,
    status: 'UPCOMING',
    attending: [],
    unattending: []
  });

  revalidatePath('/dashboard/management');
  revalidatePath('/dashboard/patrols');
}

export async function deletePatrol(formData: FormData) {
  'use server';
  const patrolId = formData.get('patrolId') as string;
  const messageId = formData.get('messageId') as string;

  if (!patrolId) return;

  if (messageId && DISCORD_BOT_TOKEN) {
    await fetch(`https://discord.com/api/v10/channels/${TARGET_CHANNEL_ID}/messages/${messageId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` }
    }).catch(() => {});
  }

  await supabase.from('patrols').delete().eq('id', patrolId);

  revalidatePath('/dashboard/management');
  revalidatePath('/dashboard/patrols');
}

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

// --- PAGE COMPONENT ---

export default async function ManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('discord_user')?.value;
  const user = userCookie ? JSON.parse(userCookie) : { username: 'Central Operations Team' };
  const currentModName = user.nickname || user.username || 'Central Operations Team';

  const resolvedSearchParams = await searchParams;
  const modSearchQuery = resolvedSearchParams.search || '';

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
      supabase.from('user_whitelists').select('*').order('collar_number', { ascending: true }).limit(200)
    ]);

    notices = noticesRes.data || [];
    moderationLogs = moderationRes.data || [];
    patrols = patrolsRes.data || [];
    
    const rawWhitelists = whitelistsRes.data || [];
    allWhitelistedUsers = await Promise.all(
      rawWhitelists.map(async (w) => {
        const discordInfo = await fetchDiscordMemberInfo(w.discord_id);
        const userLogs = moderationLogs.filter((m) => m.discord_id === w.discord_id);
        return {
          ...w,
          discord: discordInfo,
          moderation: userLogs
        };
      })
    );
  } catch (err) {
    console.error('Management page query error:', err);
  }

  return (
    <ManagementClient 
      currentModName={currentModName}
      allUsers={allWhitelistedUsers}
      notices={notices}
      moderationLogs={moderationLogs}
      patrols={patrols}
      modSearchQuery={modSearchQuery}
      actions={{
        postNotice,
        editNotice,
        deleteNotice,
        issueModeration,
        createManagementPatrol,
        deletePatrol
      }}
    />
  );
}