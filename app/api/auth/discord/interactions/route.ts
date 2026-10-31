import { NextResponse } from 'next/server';
import { verifyKey } from 'discord-interactions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;

export async function POST(request: Request) {
  try {
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    const rawBody = await request.text();

    if (!signature || !timestamp || !DISCORD_PUBLIC_KEY) {
      return new Response('Bad request signature', { status: 401 });
    }

    const isValidRequest = await verifyKey(
      rawBody,
      signature,
      timestamp,
      DISCORD_PUBLIC_KEY
    );

    if (!isValidRequest) {
      return new Response('Invalid request signature', { status: 401 });
    }

    const body = JSON.parse(rawBody);

    if (body.type === 1) {
      return NextResponse.json({ type: 1 });
    }

    if (body.type === 3) {
      const customId = body.data?.custom_id;
      if (!customId || (!customId.startsWith('patrol_book_on') && !customId.startsWith('patrol_not_attending'))) {
        return NextResponse.json({ type: 4, data: { content: 'Unknown action.', flags: 64 } });
      }

      const member = body.member;
      const discordUser = member?.user || body.user;
      const discordId = discordUser?.id;

      if (!discordId) {
        return NextResponse.json({ type: 4, data: { content: 'Could not resolve Discord ID.', flags: 64 } });
      }

      // Prioritize Discord Guild Nickname
      let userName = member?.nick || discordUser?.global_name || discordUser?.username;

      if (!member?.nick) {
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
      }

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

      await supabase
        .from('patrols')
        .update({ attending, unattending })
        .eq('id', patrol.id);

      const bookedOnList = attending.length > 0 ? attending.map((n: string) => `• ${n}`).join('\n') : 'No personnel booked on yet.';
      const notAttendingList = unattending.length > 0 ? unattending.map((n: string) => `• ${n}`).join('\n') : 'No personnel marked absent.';

      const embed = body.message?.embeds?.[0] || {};
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
    console.error('Interaction verification error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}