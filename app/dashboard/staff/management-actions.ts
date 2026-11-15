'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { getPortalUser } from '@/lib/portal';
import { postPatrol } from '@/lib/patrol-post';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const TARGET_CHANNEL_ID = '1532786346920247398';

// Every action here is management only - checked again on the server, not just by hiding the tab.
async function requireManagement() {
  const user = await getPortalUser();
  // Management tools live inside the Staff Panel, so you must be allowed into the panel as well.
  if (!user?.canStaff || !user.isManagement) throw new Error('Not allowed');
}


export async function postNotice(formData: FormData) {
  await requireManagement();
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

  revalidatePath('/dashboard/staff');
  revalidatePath('/dashboard');
}

export async function editNotice(formData: FormData) {
  await requireManagement();
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

  revalidatePath('/dashboard/staff');
  revalidatePath('/dashboard');
}

export async function deleteNotice(formData: FormData) {
  await requireManagement();
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

  revalidatePath('/dashboard/staff');
  revalidatePath('/dashboard');
}

export async function issueModeration(formData: FormData) {
  await requireManagement();
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

  revalidatePath('/dashboard/staff');
}

export async function createManagementPatrol(formData: FormData) {
  await requireManagement();
  await postPatrol(formData);
}

export async function deletePatrol(formData: FormData) {
  await requireManagement();
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

  revalidatePath('/dashboard/staff');
  revalidatePath('/dashboard/patrols');
}

