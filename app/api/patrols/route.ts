import { NextResponse } from 'next/server';
import { getDiscordDisplayName, getDiscordSession } from '@/lib/discord-session';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const TARGET_CHANNEL_ID = '1532786346920247398';

interface CreatePatrolBody {
  title?: string;
  division?: string;
  date?: string;
  time?: string;
  lead?: string;
  description?: string;
  id?: string;
}

export async function POST(request: Request) {
  try {
    const session = await getDiscordSession();
    const creatorName = session ? getDiscordDisplayName(session) : 'Server Staff';

    const body = (await request.json()) as CreatePatrolBody;
    const { title, division, date, time, lead, description, id } = body;

    const embed = {
      title: `New Event : ${title}`,
      description: description || 'No additional details provided.',
      color: 5793266,
      fields: [
        { name: 'Division', value: division || 'N/A', inline: true },
        { name: 'Shift Lead', value: lead || creatorName || 'Unassigned', inline: true },
        { name: 'Shift ID', value: id || 'PAT-001', inline: true },
        { name: 'Date', value: date || 'TBD', inline: true },
        { name: 'Time', value: time || 'TBD', inline: true },
        { name: 'Status', value: 'UPCOMING', inline: true },
        { name: 'Booked On (0)', value: 'No personnel booked on yet.', inline: false },
        { name: 'Not Attending (0)', value: 'No personnel marked absent.', inline: false }
      ],
      footer: {
        text: `Central Operations Portal • Created by ${creatorName || 'Server Staff'}`
      },
      timestamp: new Date().toISOString()
    };

    let discordMessageId = null;

    if (DISCORD_BOT_TOKEN) {
      const response = await fetch(`https://discord.com/api/v10/channels/${TARGET_CHANNEL_ID}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ embeds: [embed] }),
      });

      if (response.ok) {
        const messageData = await response.json();
        discordMessageId = messageData.id;
      } else {
        const errorData = await response.text();
        console.error('Failed to post Discord embed:', errorData);
      }
    }

    // Save patrol and its associated Discord message ID in Supabase
    if (id) {
      await supabase.from('patrols').upsert({
        id,
        discord_message_id: discordMessageId,
        title,
        division,
        date,
        time,
        lead,
        description,
        status: 'UPCOMING'
      });
    }

    return NextResponse.json({ success: true, createdBy: creatorName, discordMessageId });
  } catch (error) {
    console.error('Error handling patrol creation:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}