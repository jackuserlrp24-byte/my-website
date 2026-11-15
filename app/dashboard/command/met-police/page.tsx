import { getDiscordSession } from '@/lib/discord-session';
import { getGuildMember } from '@/lib/discord-member';
import { LOG_CHANNEL_ID } from '@/lib/training-config';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { purgeOldBodycam } from '@/lib/bodycam';
import MetPoliceClient from './MetPoliceClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_AUDIT_CHANNEL_ID = LOG_CHANNEL_ID; // the one log channel

// Helper to send Discord embed logs without emojis
async function sendDiscordEmbedLog(title: string, description: string, fields: { name: string; value: string; inline?: boolean }[]) {
  if (!DISCORD_BOT_TOKEN || !DISCORD_AUDIT_CHANNEL_ID) return;
  try {
    await fetch(`https://discord.com/api/v10/channels/${DISCORD_AUDIT_CHANNEL_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [{
          title: title,
          description: description,
          color: 36941, // Met Police Blue
          fields: fields,
          timestamp: new Date().toISOString()
        }]
      }),
    });
  } catch (err) {
    console.error('Failed to send Discord embed audit log:', err);
  }
}

// --- SERVER ACTIONS ---

export async function submitRoleRequest(formData: FormData) {
  'use server';
  const targetDiscordId = formData.get('targetDiscordId') as string;
  const targetName = formData.get('targetName') as string;
  const collarNumber = formData.get('collarNumber') as string;
  const roleName = formData.get('roleName') as string;
  const reason = formData.get('reason') as string;
  const issuerName = formData.get('issuerName') as string;

  if (!targetDiscordId || !roleName) return;

  try {
    // Insert into Supabase
    const { error } = await supabase.from('met_role_requests').insert([
      { 
        target_discord_id: targetDiscordId, 
        target_name: targetName, 
        collar_number: collarNumber, 
        role_name: roleName, 
        reason: reason, 
        issuer_name: issuerName,
        status: 'pending' 
      }
    ]);

    if (error) {
      console.error('Supabase Insert Error:', error.message, error.details);
    }

    // Send Discord Embed Log
    await sendDiscordEmbedLog(
      'NEW ROLE REQUEST SUBMITTED',
      'A new department role addition request has been logged.',
      [
        { name: 'Officer', value: `${targetName} (Collar: #${collarNumber || 'N/A'})`, inline: true },
        { name: 'Discord ID', value: targetDiscordId, inline: true },
        { name: 'Requested Role', value: `@${roleName}`, inline: false },
        { name: 'Reason', value: reason, inline: false },
        { name: 'Requested By', value: issuerName, inline: true }
      ]
    );
  } catch (err) {
    console.error('Failed to submit role request:', err);
  }

  revalidatePath('/dashboard/command/met-police');
}

export async function handleRoleRequestDecision(formData: FormData) {
  'use server';
  const requestId = formData.get('requestId') as string;
  const decision = formData.get('decision') as string;
  const reviewerName = formData.get('reviewerName') as string;

  if (!requestId || !decision) return;

  try {
    const { data: request } = await supabase
      .from('met_role_requests')
      .update({ status: decision, reviewer_name: reviewerName, updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .select()
      .single();

    if (request) {
      await sendDiscordEmbedLog(
        `ROLE REQUEST ${decision.toUpperCase()}`,
        `A role addition request has been ${decision}.`,
        [
          { name: 'Officer', value: `${request.target_name} [${request.target_discord_id}]`, inline: true },
          { name: 'Role', value: `@${request.role_name}`, inline: true },
          { name: 'Reviewed By', value: reviewerName, inline: true }
        ]
      );
    }
  } catch (err) {
    console.error('Failed to update role request decision:', err);
  }

  revalidatePath('/dashboard/command/met-police');
}

export async function logTrainingRecord(formData: FormData) {
  'use server';
  const trainingName = formData.get('trainingName') as string;
  const targetDiscordId = formData.get('targetDiscordId') as string;
  const notes = formData.get('notes') as string;
  const issuerName = formData.get('issuerName') as string;

  if (!trainingName || !targetDiscordId) return;

  try {
    await supabase.from('met_training_records').insert([
      { training_name: trainingName, target_discord_id: targetDiscordId, notes, issuer_name: issuerName }
    ]);

    await sendDiscordEmbedLog(
      'TRAINING SESSION RECORDED',
      'An officer training attendance has been logged.',
      [
        { name: 'Course', value: trainingName, inline: true },
        { name: 'Attendee ID', value: targetDiscordId, inline: true },
        { name: 'Notes', value: notes, inline: false },
        { name: 'Logged By', value: issuerName, inline: true }
      ]
    );
  } catch (err) {
    console.error('Failed to log training:', err);
  }

  revalidatePath('/dashboard/command/met-police');
}

type DiscordInfo = {
  nickname: string | null;
  username: string;
  avatar: string | null;
  roles: { id: string; name: string; position: number; color: string }[];
} | null;

const discordHeaders = { Authorization: `Bot ${DISCORD_BOT_TOKEN}` };

async function fetchGuildRoleMap() {
  const guild = process.env.DISCORD_GUILD_ID;
  const map = new Map<string, { name: string; color: number; position: number }>();
  if (!DISCORD_BOT_TOKEN || !guild) return map;
  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guild}/roles`, { headers: discordHeaders, next: { revalidate: 3600 } });
    if (res.ok) {
      const roles = (await res.json()) as { id: string; name: string; color: number; position: number }[];
      roles.forEach((r) => map.set(r.id, { name: r.name, color: r.color, position: r.position }));
    }
  } catch {}
  return map;
}

// ONE request per 1000 members (cached 2 min) instead of one request per officer.
async function fetchGuildMembersById(wanted: Set<string>) {
  const guild = process.env.DISCORD_GUILD_ID;
  const found = new Map<string, any>();
  if (!DISCORD_BOT_TOKEN || !guild) return found;
  try {
    let after = '0';
    for (let page = 0; page < 5 && found.size < wanted.size; page++) {
      const res = await fetch(`https://discord.com/api/v10/guilds/${guild}/members?limit=1000&after=${after}`, {
        headers: discordHeaders,
        next: { revalidate: 120 },
      });
      if (!res.ok) break;
      const members = (await res.json()) as any[];
      if (!members.length) break;
      for (const m of members) if (m.user?.id && wanted.has(m.user.id)) found.set(m.user.id, m);
      if (members.length < 1000) break;
      after = members[members.length - 1].user.id;
    }
  } catch {}
  return found;
}

function shapeDiscordInfo(userId: string, member: any, roleMap: Awaited<ReturnType<typeof fetchGuildRoleMap>>): DiscordInfo {
  if (!member) return null;
  const roles = (member.roles || [])
    .map((id: string) => {
      const r = roleMap.get(id);
      return r ? { id, name: r.name, position: r.position, color: r.color !== 0 ? `#${r.color.toString(16).padStart(6, '0')}` : '#a3a3a3' } : null;
    })
    .filter(Boolean);
  return {
    nickname: member.nick || null,
    username: member.user?.username || 'Unknown',
    avatar: member.user?.avatar ? `https://cdn.discordapp.com/avatars/${userId}/${member.user.avatar}.png` : null,
    roles,
  };
}

// --- PAGE COMPONENT ---

export default async function MetPoliceCommandPage() {
  const session = await getDiscordSession();
  const user: Partial<DiscordSessionUser> = session ?? { username: 'Bronze Commander' };
  const currentCommandName = user.nickname || user.username || 'Bronze Commander';

  let roleRequests: any[] = [];
  let trainingRecords: any[] = [];
  let allWhitelistedUsers: any[] = [];
  let bodycam: any[] = [];

  try {
    const [reqsRes, trainingRes, whitelistsRes, bodycamRes] = await Promise.all([
      supabase.from('met_role_requests').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('met_training_records').select('*').order('created_at', { ascending: false }).limit(300),
      supabase.from('user_whitelists').select('*').order('collar_number', { ascending: true }).limit(200),
      // Newest bodycam clips (cleaning up expired ones at the same time).
      purgeOldBodycam().then(() =>
        supabase
          .from('bodycam_incidents')
          .select('id, created_at, officer_name, officer_discord_id, target_name, target_discord_id, serial, coords, total_ms, segments')
          .eq('status', 'ready')
          .order('created_at', { ascending: false })
          .limit(60)
      ),
    ]);
    bodycam = (bodycamRes.data || []).map(({ segments, ...rest }: any) => ({ ...rest, segment_count: Array.isArray(segments) ? segments.length : 0 }));

    roleRequests = reqsRes.data || [];
    trainingRecords = trainingRes.data || [];

    const rawWhitelists = whitelistsRes.data || [];
    const ids = new Set<string>(rawWhitelists.map((w: any) => String(w.discord_id)).filter(Boolean));
    const [roleMap, members] = await Promise.all([fetchGuildRoleMap(), fetchGuildMembersById(ids)]);

    // Anyone the bulk list missed (bot without the members intent, or a huge server) falls back to the
    // cached single lookup, a few at a time so Discord doesn't rate limit us.
    const missing = Array.from(ids).filter((id) => !members.has(id));
    for (let i = 0; i < missing.length; i += 8) {
      await Promise.all(
        missing.slice(i, i + 8).map(async (id) => {
          const r = await getGuildMember(id);
          if (r.status === 'ok') members.set(id, r.member);
        })
      );
    }

    allWhitelistedUsers = rawWhitelists.map((w: any) => ({
      ...w,
      discord: shapeDiscordInfo(String(w.discord_id), members.get(String(w.discord_id)), roleMap),
    }));
  } catch (err) {
    console.error('Met Police command page fetch error:', err);
  }

  return (
    <MetPoliceClient
      currentCommandName={currentCommandName}
      allUsers={allWhitelistedUsers}
      roleRequests={roleRequests}
      trainingRecords={trainingRecords}
      bodycam={bodycam}
      actions={{
        submitRoleRequest,
        handleRoleRequestDecision,
        logTrainingRecord
      }}
    />
  );
}