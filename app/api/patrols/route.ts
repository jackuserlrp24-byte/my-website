import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const TARGET_CHANNEL_ID = '1532786346920247398';

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, date, startTime, endTime, description, id } = body;

    const timeString = `${startTime || 'TBD'}\n${endTime || 'TBD'}`;
    const portalLink = 'https://www.centraloperationsportal.com/dashboard/patrols';

    const embed = {
      title: title || 'Patrol Shift',
      description: description || 'No additional details provided.',
      color: 5793266,
      fields: [
        { name: 'Shift ID', value: id || 'PAT-001', inline: true },
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
      const response = await fetch(`https://discord.com/api/v10/channels/${TARGET_CHANNEL_ID}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ embeds: [embed], components }),
      });

      if (response.ok) {
        const messageData = await response.json();
        discordMessageId = messageData.id;
      }
    }

    if (id) {
      await supabase.from('patrols').upsert({
        id,
        discord_message_id: discordMessageId,
        title,
        date,
        time: timeString,
        description,
        status: 'UPCOMING',
        attending: [],
        unattending: [],
        created_at: new Date().toISOString()
      });
    }

    return NextResponse.json({ success: true, discordMessageId });
  } catch (error) {
    console.error('Error handling patrol creation:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}