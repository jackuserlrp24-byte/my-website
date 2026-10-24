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
    const { patrolId, attendance } = body; // attendance = { attending: string[], unattending: string[] }

    if (!patrolId || !attendance) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    // 1. Fetch the patrol record from Supabase to get its stored Discord message ID
    const { data: patrol, error: dbError } = await supabase
      .from('patrols')
      .select('discord_message_id')
      .eq('id', patrolId)
      .maybeSingle();

    if (dbError || !patrol || !patrol.discord_message_id) {
      return NextResponse.json({ success: false, error: 'Patrol or Discord Message ID not found' }, { status: 404 });
    }

    const discordMessageId = patrol.discord_message_id;

    // 2. Format attendance arrays into clean bullet lists
    const bookedOnList = attendance.attending && attendance.attending.length > 0
      ? attendance.attending.map((name: string) => `• ${name}`).join('\n')
      : 'No personnel booked on yet.';

    const notAttendingList = attendance.unattending && attendance.unattending.length > 0
      ? attendance.unattending.map((name: string) => `• ${name}`).join('\n')
      : 'No personnel marked absent.';

    // 3. Fetch the existing message from Discord so we preserve its header, title, and other fields
    const getMsgRes = await fetch(`https://discord.com/api/v10/channels/${TARGET_CHANNEL_ID}/messages/${discordMessageId}`, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` }
    });

    if (!getMsgRes.ok) {
      return NextResponse.json({ success: false, error: 'Failed to fetch message from Discord' }, { status: 404 });
    }

    const msgData = await getMsgRes.json();
    const existingEmbed = msgData.embeds[0] || {};

    // 4. Update the fields array with the new names and counts
    if (existingEmbed.fields) {
      existingEmbed.fields = existingEmbed.fields.map((field: { name: string; value: string; inline?: boolean }) => {
        if (field.name.startsWith('Booked On') || field.name.startsWith('Attending')) {
          return { name: `Booked On (${attendance.attending.length})`, value: bookedOnList, inline: false };
        }
        if (field.name.startsWith('Not Attending')) {
          return { name: `Not Attending (${attendance.unattending.length})`, value: notAttendingList, inline: false };
        }
        return field;
      });
    }

    // 5. Send a PATCH request to Discord to update the message live
    const patchRes = await fetch(`https://discord.com/api/v10/channels/${TARGET_CHANNEL_ID}/messages/${discordMessageId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ embeds: [existingEmbed] })
    });

    if (!patchRes.ok) {
      const errText = await patchRes.text();
      console.error('Failed to update Discord embed:', errText);
      return NextResponse.json({ success: false, error: 'Failed to update Discord embed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating attendance:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}