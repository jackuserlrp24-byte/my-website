import { NextResponse } from 'next/server';
import { getDiscordDisplayName, getDiscordSession } from '@/lib/discord-session';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const TARGET_CHANNEL_ID = '1532786346920247398';

// GET: Fetch active patrols created within the last 24 hours
export async function GET() {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('patrols')
      .select('*')
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch patrols:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, patrols: data || [] });
  } catch (error) {
    console.error('Error fetching patrols:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Create a new patrol shift
export async function POST(request: Request) {
  try {
    const session = await getDiscordSession();
    const creatorName = session ? getDiscordDisplayName(session) : 'Server Staff';

    const body = await request.json();
    const { title, date, startTime, endTime, description, id } = body;

    const portalLink = 'https://www.centraloperationsportal.com/dashboard/patrols';

    const embed = {
      title: `New Event : ${title}`,
      description: `${description || 'No additional details provided.'}\n\n**Book Attendance:**\nYou can book on or update your status through the portal here:\n${portalLink}`,
      color: 5793266,
      fields: [
        { name: 'Shift ID', value: id || 'PAT-001', inline: true },
        { name: 'Date', value: date || 'TBD', inline: true },
        { name: 'Start Time', value: startTime || 'TBD', inline: true },
        { name: 'End Time', value: endTime || 'TBD', inline: true },
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

    if (id) {
      await supabase.from('patrols').upsert({
        id,
        discord_message_id: discordMessageId,
        title,
        date,
        start_time: startTime,
        end_time: endTime,
        description,
        status: 'UPCOMING',
        attending: [],
        unattending: [],
        created_at: new Date().toISOString()
      });
    }

    return NextResponse.json({ success: true, createdBy: creatorName, discordMessageId });
  } catch (error) {
    console.error('Error handling patrol creation:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}