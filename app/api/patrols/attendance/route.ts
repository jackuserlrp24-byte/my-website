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

    // 1. Handle Discord Ping (Interaction Verification)
    if (body.type === 1) {
      return NextResponse.json({ type: 1 });
    }

    // 2. Handle Discord Button Click Interaction (Type 3)
    if (body.type === 3 && body.data?.custom_id) {
      const customId = body.data.custom_id; // e.g., "patrol_book_PAT-001"
      const parts = customId.split('_');
      const action = parts[1]; // "book" or "unattend"
      const patrolId = parts.slice(2).join('_'); // "PAT-001"

      const user = body.member?.user || body.user;
      const displayName = body.member?.nick || user?.global_name || user?.username || 'Unknown Operator';

      const { data: patrol, error: fetchErr } = await supabase
        .from('patrols')
        .select('*')
        .eq('id', patrolId)
        .maybeSingle();

      if (fetchErr || !patrol) {
        return NextResponse.json({ type: 4, data: { content: 'Patrol shift not found.', flags: 64 } });
      }

      let attending: string[] = patrol.attending || [];
      let unattending: string[] = patrol.unattending || [];

      attending = attending.filter((n: string) => n !== displayName);
      unattending = unattending.filter((n: string) => n !== displayName);

      if (action === 'book') {
        attending.push(displayName);
      } else if (action === 'unattend') {
        unattending.push(displayName);
      }

      await supabase
        .from('patrols')
        .update({ attending, unattending })
        .eq('id', patrolId);

      const bookedOnList = attending.length > 0 ? attending.map((n: string) => `• ${n}`).join('\n') : 'No personnel booked on yet.';
      const notAttendingList = unattending.length > 0 ? unattending.map((n: string) => `• ${n}`).join('\n') : 'No personnel marked absent.';

      if (patrol.discord_message_id) {
        const msgRes = await fetch(`https://discord.com/api/v10/channels/${TARGET_CHANNEL_ID}/messages/${patrol.discord_message_id}`, {
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

          await fetch(`https://discord.com/api/v10/channels/${TARGET_CHANNEL_ID}/messages/${patrol.discord_message_id}`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              embeds: [embed],
              components: msgData.components
            })
          });
        }
      }

      return NextResponse.json({
        type: 7, // UPDATE_MESSAGE
        data: {
          content: `Attendance updated for **${displayName}**!`
        }
      });
    }

    // 3. Handle Website Frontend Request
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

    if (patrolRecord?.discord_message_id) {
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
          body: JSON.stringify({
            embeds: [embed],
            components: msgData.components
          })
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in attendance route:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}