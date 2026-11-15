import { NextResponse, after } from 'next/server';
import { verifyKey } from 'discord-interactions';
import { createClient } from '@supabase/supabase-js';
import { canReviewRoleRequests, supabaseAdmin } from '@/lib/portal';
import { sendDm } from '@/lib/discord';
import { reviewRoleRequest } from '@/lib/role-requests';
import { roleRequestPayload, trainingDmPayload, trainingPayload } from '@/lib/embeds';
import { bookOnTraining, cantMakeTraining } from '@/lib/training-attend';
import type { Training } from '@/lib/portal-types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;

type Interaction = {
  application_id?: string;
  token?: string;
  member?: { roles?: string[]; nick?: string; user?: { username?: string; global_name?: string } };
  message?: { id?: string };
};

const reply = (content: string) => NextResponse.json({ type: 4, data: { content, flags: 64 } });

async function handleTrainingButton(body: Interaction, customId: string, userName: string, discordId: string) {
  const { data } = await supabaseAdmin
    .from('trainings')
    .select('*')
    .eq('discord_message_id', body.message?.id)
    .maybeSingle();
  if (!data) return reply('Error: Could not locate active training record for this message.');

  // "Can't Make It": take them off the roster and log it on the post.
  if (customId === 'training_cant_make_it' || customId === 'training_not_attending') {
    const out = await cantMakeTraining(data as Training, userName, discordId);
    if (out.status === 'already') return reply("You're already marked as unable to make this training.");
    if (out.status !== 'removed') return reply(out.message);

    let name: string | null = null;
    if (out.training.division_id) {
      const { data: div } = await supabaseAdmin.from('divisions').select('name').eq('id', out.training.division_id).maybeSingle();
      name = div?.name ?? null;
    }
    return NextResponse.json({ type: 7, data: trainingPayload(out.training, name) });
  }

  // Role check uses the roles Discord sends with the click, so it is always live.
  const result = await bookOnTraining(data as Training, userName, body.member?.roles ?? [], discordId);
  if (result.status === 'already') return reply('You are already booked on this training.');
  if (result.status !== 'booked') return reply(result.message);

  const training = result.training;
  let divName: string | null = null;
  if (training.division_id) {
    const { data: div } = await supabaseAdmin.from('divisions').select('name').eq('id', training.division_id).maybeSingle();
    divName = div?.name ?? null;
  }

  // Answer Discord straight away (3s limit), then DM + confirm privately.
  after(async () => {
    const sent = await sendDm(discordId, trainingDmPayload(training, divName));
    if (body.application_id && body.token) {
      await fetch(`https://discord.com/api/v10/webhooks/${body.application_id}/${body.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flags: 64,
          content: sent
            ? "You're booked on. I've DMed you the details and which VC to wait in."
            : "You're booked on, but I couldn't DM you. Turn on DMs from server members so you get the details.",
        }),
      }).catch(() => {});
    }
  });

  return NextResponse.json({ type: 7, data: trainingPayload(training, divName) });
}

async function handleRoleRequestButton(body: Interaction, customId: string) {
  if (!canReviewRoleRequests(body.member?.roles ?? [])) {
    return reply('Only Gold Command can approve or deny role requests.');
  }

  const [action, id] = customId.split(':');
  const reviewer = body.member?.nick || body.member?.user?.global_name || body.member?.user?.username || 'Gold Command';

  const result = await reviewRoleRequest(id, action === 'rolereq_approve', reviewer);
  if (!result.ok) return reply(result.message);

  return NextResponse.json({ type: 7, data: roleRequestPayload(result.row, result.label, false) });
}

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
      if (customId?.startsWith('rolereq_')) {
        return handleRoleRequestButton(body, customId);
      }
      const BUTTON_IDS = ['patrol_book_on', 'patrol_not_attending', 'training_attend', 'training_book_on', 'training_not_attending', 'training_cant_make_it'];
      if (!customId || !BUTTON_IDS.includes(customId)) {
        return NextResponse.json({ type: 4, data: { content: 'Unknown action.', flags: 64 } });
      }

      // Patrol and training posts share the same roster buttons; only the table differs.
      const table = customId.startsWith('training_') ? 'trainings' : 'patrols';
      const recordLabel = table === 'trainings' ? 'training' : 'patrol';

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

      if (table === 'trainings') {
        return handleTrainingButton(body, customId, userName, discordId);
      }

      const messageId = body.message?.id;
      const { data: patrol } = await supabase
        .from(table)
        .select('*')
        .eq('discord_message_id', messageId)
        .maybeSingle();

      if (!patrol) {
        return NextResponse.json({
          type: 4,
          data: { content: `Error: Could not locate active ${recordLabel} record for this message.`, flags: 64 }
        });
      }

      let attending: string[] = patrol.attending || [];
      let unattending: string[] = patrol.unattending || [];

      attending = attending.filter((n: string) => n !== userName);
      unattending = unattending.filter((n: string) => n !== userName);

      const actionType = customId.endsWith('_book_on') ? 'attending' : 'unattending';
      if (actionType === 'attending') {
        attending.push(userName);
      } else {
        unattending.push(userName);
      }

      await supabase
        .from(table)
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