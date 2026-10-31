import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Handle Discord PING verification (required for Discord Interactions Endpoint setup)
    if (body.type === 1) {
      return NextResponse.json({ type: 1 });
    }

    // 2. Handle Button Clicks (Interaction Type 3)
    if (body.type === 3) {
      const customId = body.data?.custom_id;
      if (!customId || (!customId.startsWith('patrol_book_on') && !customId.startsWith('patrol_not_attending'))) {
        return NextResponse.json({ type: 4, data: { content: 'Unknown action.', flags: 64 } });
      }

      const discordUser = body.member?.user || body.user;
      const discordId = discordUser?.id;

      if (!discordId) {
        return NextResponse.json({ type: 4, data: { content: 'Could not resolve your Discord ID.', flags: 64 } });
      }

      // 3. Resolve user's portal name / collar number from Supabase (user_whitelists)
      let userName = discordUser.global_name || discordUser.username;

      const { data: whitelistRecord } = await supabase
        .from('user_whitelists')
        .select('collar_number, rp_name, forename, surname')
        .eq('discord_id', discordId)
        .maybeSingle();

      if (whitelistRecord) {
        const collar = whitelistRecord.collar_number ? `[${whitelistRecord.collar_number}] ` : '';
        const name = whitelistRecord.rp_name || `${whitelistRecord.forename} ${whitelistRecord.surname}`;
        userName = `${collar}${name}`;
      } else if (DISCORD_BOT_TOKEN && DISCORD_GUILD_ID) {
        // Fallback: fetch their server nickname via Discord API
        try {
          const memberRes = await fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${discordId}`, {
            headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` }
          });
          if (memberRes.ok) {
            const memberData = await memberRes.json();
            if (memberData.nick) {
              userName = memberData.nick;
            }
          }
        } catch (e) {
          console.error('Failed to fetch guild member nickname:', e);
        }
      }

      // 4. Find the active patrol linked to this Discord message ID
      const messageId = body.message?.id;
      const { data: patrol } = await supabase
        .from('patrols')
        .select('*')
        .eq('discord_message_id', messageId)
        .maybeSingle();

      if (!patrol) {
        return NextResponse.json({
          type: 4,
          data: { content: 'Error: Could not locate active patrol record for this message.', flags: 64 }
        });
      }

      // 5. Update attendance lists
      let attending: string[] = patrol.attending || [];
      let unattending: string[] = patrol.unattending || [];

      attending = attending.filter((n: string) => n !== userName);
      unattending = unattending.filter((n: string) => n !== userName);

      const actionType = customId === 'patrol_book_on' ? 'attending' : 'unattending';
      if (actionType === 'attending') {
        attending.push(userName);
      } else {
        unattending.push(userName);
      }

      // Update Supabase database
      await supabase
        .from('patrols')
        .update({ attending, unattending })
        .eq('id', patrol.id);

      // 6. Update Discord Embed Fields
      const bookedOnList = attending.length > 0 ? attending.map((n: string) => `• ${n}`).join('\n') : 'No personnel booked on yet.';
      const notAttendingList = unattending.length > 0 ? unattending.map((n: string) => `• ${n}`).join('\n') : 'No personnel marked absent.';

      const embed = body.message?.embeds?.[0] || {};
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

      // Type 7 = UPDATE_MESSAGE (modifies the Discord message instantly without timing out)
      return NextResponse.json({
        type: 7,
        data: {
          embeds: [embed],
          components: body.message?.components || []
        }
      });
    }

    return NextResponse.json({ error: 'Invalid interaction type' }, { status: 400 });
  } catch (err) {
    console.error('Interaction error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}