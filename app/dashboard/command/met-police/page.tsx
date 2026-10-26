import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import MetPoliceClient from './MetPoliceClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_AUDIT_CHANNEL_ID = '1564285919564136711';

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

async function fetchDiscordMemberInfo(userId: string) {
  const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
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
    guildRoles.forEach((r: { id: string; name: string; color: number; position: number }) => 
      roleMap.set(r.id, { name: r.name, color: r.color, position: r.position })
    );

    const resolvedRoles = (member.roles || []).map((id: string) => {
      const r = roleMap.get(id);
      return r ? { 
        id, 
        name: r.name, 
        position: r.position,
        color: r.color !== 0 ? `#${r.color.toString(16).padStart(6, '0')}` : '#a3a3a3' 
      } : null;
    }).filter(Boolean);

    return {
      nickname: member.nick || null,
      username: member.user?.username || 'Unknown',
      avatar: member.user?.avatar ? `https://cdn.discordapp.com/avatars/${userId}/${member.user.avatar}.png` : null,
      roles: resolvedRoles
    };
  } catch {
    return null;
  }
}

// --- PAGE COMPONENT ---

export default async function MetPoliceCommandPage() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('discord_user')?.value;
  const user = userCookie ? JSON.parse(userCookie) : { username: 'Bronze Commander' };
  const currentCommandName = user.nickname || user.username || 'Bronze Commander';

  let roleRequests: any[] = [];
  let trainingRecords: any[] = [];
  let allWhitelistedUsers: any[] = [];

  try {
    const [reqsRes, trainingRes, whitelistsRes] = await Promise.all([
      supabase.from('met_role_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('met_training_records').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('user_whitelists').select('*').order('collar_number', { ascending: true }).limit(200)
    ]);

    roleRequests = reqsRes.data || [];
    trainingRecords = trainingRes.data || [];

    const rawWhitelists = whitelistsRes.data || [];
    allWhitelistedUsers = await Promise.all(
      rawWhitelists.map(async (w) => {
        const discordInfo = await fetchDiscordMemberInfo(w.discord_id);
        return {
          ...w,
          discord: discordInfo
        };
      })
    );
  } catch (err) {
    console.error('Met Police command page fetch error:', err);
  }

  return (
    <MetPoliceClient
      currentCommandName={currentCommandName}
      allUsers={allWhitelistedUsers}
      roleRequests={roleRequests}
      trainingRecords={trainingRecords}
      actions={{
        submitRoleRequest,
        handleRoleRequestDecision,
        logTrainingRecord
      }}
    />
  );
}