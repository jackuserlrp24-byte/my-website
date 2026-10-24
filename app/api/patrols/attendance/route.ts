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

    // 1. Update Supabase
    await supabase
      .from('patrols')
      .update({ attending, unattending })
      .eq('id', patrolId);

    // 2. Fetch Discord Message ID
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
              return { name: `Booked On (${attending.length})`, value: bookedOnList, inline: false };
            }
            if (field.name.startsWith('Not Attending')) {
              return { name: `Not Attending (${unattending.length})`, value: notAttendingList, inline: false };
            }
            return field;
          });
        }

        await fetch(`https://discord.com/api/v10/channels/${TARGET_CHANNEL_ID}/messages/${patrolRecord.discord_message_id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ embeds: [embed] })
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating attendance:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}