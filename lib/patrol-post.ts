import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/portal';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const TARGET_CHANNEL_ID = '1532786346920247398';

/** Creates a patrol: posts the Discord embed (with Book On / Not Attending buttons) and saves it to the portal. */
export async function postPatrol(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const title = formData.get('title') as string;
  const date = formData.get('date') as string;
  const startTime = formData.get('startTime') as string;
  const endTime = formData.get('endTime') as string;
  const description = formData.get('description') as string;
  const imageUrl = formData.get('imageUrl') as string;

  if (!title) return { ok: false, message: 'Give the patrol a title.' };

  const countRes = await supabaseAdmin.from('patrols').select('id', { count: 'exact', head: true });
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

  const { error } = await supabaseAdmin.from('patrols').insert({
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
    return { ok: false, message: 'Could not save the patrol. Try again.' };
  }

  revalidatePath('/staff');
  revalidatePath('/staff/patrols');
  revalidatePath('/dashboard/patrols');
  return {
    ok: true,
    message: discordMessageId ? `${patrolId} posted to Discord and the portal.` : `${patrolId} saved, but it could not be posted to Discord.`,
  };
}
