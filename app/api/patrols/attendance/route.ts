import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const TARGET_CHANNEL_ID = '1532786346920247398';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patrolId, attendance } = body;

    if (!patrolId || !attendance) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    const { attending, unattending } = attendance;

    await supabase
      .from('patrols')
      .update({ attending, unattending })
      .eq('id', patrolId);

    const { data: patrolRecord } = await supabase
      .from('patrols')
      .select('discord_message_id')
      .eq('id', patrolId)
      .maybeSingle();

    if (patrolRecord?.discord_message_id && DISCORD_BOT_TOKEN) {
      const bookedOnList = attending.length > 0 ? attending.map((n: string) => `• ${n}`).join('\n') : 'No personnel booked on yet.';
      const notAttendingList = unattending.length > 0 ? unattending.map((n: string) => `• ${n}`).join('\n') : 'No personnel marked absent.';

      const msgRes = await fetch(`https://discord.com/api/v10/channels/${TARGET_CHANNEL_ID}/messages/${patrolRecord.discord_message_id}`, {
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` }
      });

      if (msgRes.ok) {
        const msgData = await msgRes.json();
        const embed = msgData.embeds[0] || {};

        if (embed.fields) {
          embed.fields = embed.fields.map((field: { name: string; value: string; inline?: boolean }) => {
            if (field.name.startsWith('Booked On')) {
              return { name: `Booked On (${attending.length})`, value: bookedOnList, inline: true };
            }
            if (field.name.startsWith('Not Attending')) {
              return { name: `Not Attending (${unattending.length})`, value: notAttendingList, inline: true };
            }
            return field;
          });
        }

        const portalLink = 'https://www.centraloperationsportal.com/dashboard/patrols';
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

        await fetch(`https://discord.com/api/v10/channels/${TARGET_CHANNEL_ID}/messages/${patrolRecord.discord_message_id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ embeds: [embed], components })
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating attendance:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}