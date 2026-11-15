'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { getPortalUser } from '@/lib/portal';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const TARGET_CHANNEL_ID = '1532786346920247398';

// Every action here is management only - checked again on the server, not just by hiding the tab.
async function requireManagement() {
  const user = await getPortalUser();
  if (!user?.isManagement) throw new Error('Not allowed');
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
  const title = formData.get('title') as string;
  const date = formData.get('date') as string;
  const startTime = formData.get('startTime') as string;
  const endTime = formData.get('endTime') as string;
  const description = formData.get('description') as string;
  const imageUrl = formData.get('imageUrl') as string;

  if (!title) return;

  const countRes = await supabase.from('patrols').select('id', { count: 'exact', head: true });
  const nextNum = (countRes.count || 0) + 1;
  const patrolId = `PAT-${nextNum < 10 ? `00${nextNum}` : nextNum < 100 ? `0${nextNum}` : nextNum}`;

  const timeString = `${startTime || 'TBD'}\n${endTime || 'TBD'}`;
  const portalLink = 'https://www.centraloperationsportal.com/dashboard/patrols';

  const embed: any = {
    title: title || 'Patrol Shift',
    description: description || 'No additional details provided.',
    color: 5793266,
    fields: [
      { name: 'Shift ID', value: patrolId, inline: true },
      { name: 'Date', value: date || 'TBD', inline: true },
      { name: 'Time', value: timeString, inline: true },
      { name: 'Status', value: 'UPCOMING', inline: false },
      { name: 'Booked On (0)', value: 'No personnel booked on yet.', inline: true },
      { name: 'Not Attending (0)', value: 'No personnel marked absent.', inline: true }
    ],
    footer: {
      text: 'Central Operations Portal'
    },
    timestamp: new Date().toISOString()
  };

  // Attach banner image to Discord embed if provided
  if (imageUrl) {
    embed.image = { url: imageUrl };
  }

  const components = [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 3,
          label: 'Book On',
          custom_id: 'patrol_book_on'
        },
        {
          type: 2,
          style: 4,
          label: 'Not Attending',
          custom_id: 'patrol_not_attending'
        },
        {
          type: 2,
          style: 5,
          label: 'View Portal',
          url: portalLink
        }
      ]
    }
  ];

  let discordMessageId = null;
  if (DISCORD_BOT_TOKEN) {
    const res = await fetch(`https://discord.com/api/v10/channels/${TARGET_CHANNEL_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '@everyone',
        embeds: [embed],
        components
      })
    });
    if (res.ok) {
      const msgData = await res.json();
      discordMessageId = msgData.id;
    }
  }

  const { error } = await supabase.from('patrols').insert({
    id: patrolId,
    discord_message_id: discordMessageId,
    title,
    date,
    time: timeString,
    description,
    image_url: imageUrl || null,
    status: 'UPCOMING',
    attending: [],
    unattending: []
  });

  if (error) {
    console.error('Supabase patrol insert error:', error.message);
  }

  revalidatePath('/dashboard/staff');
  revalidatePath('/dashboard/patrols');
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

