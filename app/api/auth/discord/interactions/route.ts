import { NextResponse, after } from 'next/server';
import { verifyKey } from 'discord-interactions';
import { createClient } from '@supabase/supabase-js';
import { canReviewRoleRequests, supabaseAdmin } from '@/lib/portal';
import { TRAININGS_CHANNEL_ID, editMessage, getGuildMember, sendDm } from '@/lib/discord';
import { reviewRoleRequest } from '@/lib/role-requests';
import { reviewAppeal } from '@/lib/appeals';
import { cantMakeRow, leftPickerComponents, roleRequestPayload, trainingDmPayload, trainingPayload } from '@/lib/embeds';
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
  message?: { id?: string; embeds?: Record<string, unknown>[] };
};

const reply = (content: string) => NextResponse.json({ type: 4, data: { content, flags: 64 } });

async function handleTrainingButton(body: Interaction, customId: string, userName: string, discordId: string) {
  // "Can't Make It" now lives on the private confirmation / DM (custom_id carries the training id).
  // Old public posts without the id still work and are found by their message id.
  const trainingIdFromButton = customId.startsWith('training_cant_make_it:') ? customId.split(':')[1] : null;
  const { data } = trainingIdFromButton
    ? await supabaseAdmin.from('trainings').select('*').eq('id', trainingIdFromButton).maybeSingle()
    : await supabaseAdmin.from('trainings').select('*').eq('discord_message_id', body.message?.id).maybeSingle();
  if (!data) return reply('Error: Could not locate active training record for this message.');

  if (customId.startsWith('training_cant_make_it') || customId === 'training_not_attending') {
    const out = await cantMakeTraining(data as Training, userName, discordId);
    if (out.status === 'already') return reply("You're already marked as unable to make this training.");
    if (out.status !== 'removed') return reply(out.message);

    // Pressed from the DM / private confirmation: update the public roster post and strip the button here.
    if (trainingIdFromButton) {
      const t = out.training;
      let divTitle: string | null = null;
      if (t.division_id) {
        const { data: div } = await supabaseAdmin.from('divisions').select('name').eq('id', t.division_id).maybeSingle();
        divTitle = div?.name ?? null;
      }
      if (t.discord_message_id) {
        await editMessage(t.discord_channel_id || TRAININGS_CHANNEL_ID, t.discord_message_id, trainingPayload(t, divTitle));
      }
      return NextResponse.json({
        type: 7,
        data: { content: `You've been taken off **${t.id}** - ${t.title}.`, components: [] },
      });
    }

    let name: string | null = null;
    if (out.training.division_id) {
      const { data: div } = await supabaseAdmin.from('divisions').select('name').eq('id', out.training.division_id).maybeSingle();
      name = div?.name ?? null;
    }
    return NextResponse.json({ type: 7, data: trainingPayload(out.training, name) });
  }

  // Role check uses the roles Discord sends with the click, so it is always live.
  const result = await bookOnTraining(data as Training, userName, body.member?.roles ?? [], discordId);
  if (result.status === 'already') {
    // Already booked: show the Can't Make It button privately (it is not on the public post).
    return NextResponse.json({
      type: 4,
      data: { content: 'You are already booked on this training.', flags: 64, components: [cantMakeRow(result.training.id)] },
    });
  }
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
          components: [cantMakeRow(training.id)],
        }),
      }).catch(() => {});
    }
  });

  return NextResponse.json({ type: 7, data: trainingPayload(training, divName) });
}

/**
 * The instructor's "did anyone leave?" DM: Yes -> pick who left (their record for this training is removed),
 * No / Done -> finish. Names are looked up after we acknowledge the click (Discord's 3 second limit).
 */
async function handleTrainingLeft(body: Interaction & { data?: { values?: string[] } }, customId: string) {
  const [action, trainingId] = customId.split(':');
  const { data } = await supabaseAdmin.from('trainings').select('*').eq('id', trainingId).maybeSingle();
  if (!data) return reply('Could not find that training.');
  const t = data as Training;

  if (action === 'training_left_no') {
    return NextResponse.json({
      type: 7,
      data: { content: `Thanks - **${t.id}** is complete and nobody was removed from the training records.`, embeds: [], components: [] },
    });
  }
  if (action === 'training_left_done') {
    const n = (t.left_ids ?? []).length;
    return NextResponse.json({
      type: 7,
      data: {
        content: n
          ? `Thanks - **${t.id}** is complete. ${n} ${n === 1 ? 'person was' : 'people were'} removed from the training records.`
          : `Thanks - **${t.id}** is complete and nobody was removed from the training records.`,
        embeds: [],
        components: [],
      },
    });
  }

  // training_left_yes / training_left_select
  const picked =
    action === 'training_left_select'
      ? (body.data?.values ?? []).filter((id) => (t.attending_ids ?? []).includes(id))
      : [];

  after(async () => {
    const removedNames: string[] = [];
    if (picked.length) {
      const names = await Promise.all(picked.map(async (id) => (await getGuildMember(id))?.name ?? `<@${id}>`));
      removedNames.push(...names);
      await supabaseAdmin.from('met_training_records').delete().eq('training_id', t.id).in('target_discord_id', picked);
      const left = Array.from(new Set([...(t.left_ids ?? []), ...picked]));
      await supabaseAdmin.from('trainings').update({ left_ids: left }).eq('id', t.id);
      t.left_ids = left;
    }

    const stillIn = (t.attending_ids ?? []).filter((id) => !(t.left_ids ?? []).includes(id)).slice(0, 100);
    const people = await Promise.all(
      stillIn.map(async (id) => {
        const m = await getGuildMember(id);
        return { id, label: m?.name || m?.username || id };
      })
    );

    const head = removedNames.length
      ? `Removed **${t.id}** from the record of: ${removedNames.join(', ')}.\n\n`
      : '';
    await editOriginal(body, {
      content: people.length
        ? `${head}Select everyone who left during **${t.id}**. **${t.id}** will be removed from their training record. Press Done when finished.`
        : `${head}There is no one left to remove. **${t.id}** is complete.`,
      embeds: [],
      components: people.length
        ? leftPickerComponents(t.id, people)
        : [],
    });
  });

  return NextResponse.json({ type: 6 });
}

async function handleRoleRequestButton(body: Interaction, customId: string) {
  if (!canReviewRoleRequests(body.member?.roles ?? [])) {
    return reply('Only Silver or Gold Command can approve or deny role requests.');
  }

  const [action, id] = customId.split(':');
  const reviewer = body.member?.nick || body.member?.user?.global_name || body.member?.user?.username || 'Gold Command';

  const result = await reviewRoleRequest(id, action === 'rolereq_approve', reviewer);
  if (!result.ok) return reply(result.message);

  return NextResponse.json({ type: 7, data: roleRequestPayload(result.row, result.label, false) });
}

// ---- Ban appeal tickets ----
const reviewerName = (b: Interaction) => b.member?.nick || b.member?.user?.global_name || b.member?.user?.username || 'Staff';

async function editOriginal(body: Interaction, payload: object) {
  if (!body.application_id || !body.token) return;
  await fetch(`https://discord.com/api/v10/webhooks/${body.application_id}/${body.token}/messages/@original`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

async function followUp(body: Interaction, content: string) {
  if (!body.application_id || !body.token) return;
  await fetch(`https://discord.com/api/v10/webhooks/${body.application_id}/${body.token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flags: 64, content }),
  }).catch(() => {});
}

/** Runs after we have already answered Discord (deferred), because unbanning + DMing can take longer than 3 seconds. */
function finishAppeal(body: Interaction, id: string, accept: boolean, note: string) {
  after(async () => {
    const result = await reviewAppeal(id, accept, reviewerName(body), note);
    if (!result.ok) return followUp(body, result.message);

    const embeds = [
      ...(body.message?.embeds ?? []),
      {
        title: accept ? 'APPEAL ACCEPTED' : 'APPEAL DENIED',
        color: accept ? 5763719 : 15548997,
        description: `${accept ? 'Accepted' : 'Denied'} by **${reviewerName(body)}**.${note ? `\n**Note:** ${note.slice(0, 800)}` : ''}\n${result.summary}`,
        timestamp: new Date().toISOString(),
      },
    ];
    await editOriginal(body, { embeds, components: [] });
  });
  return NextResponse.json({ type: 6 }); // deferred update - buttons stay until the work is done
}

function handleAppealButton(body: Interaction, customId: string) {
  if (!canReviewRoleRequests(body.member?.roles ?? [])) {
    return reply('Only Gold Command and management can decide ban appeals.');
  }
  const [action, id] = customId.split(':');
  if (!id) return reply('Invalid appeal button.');

  if (action === 'appeal_accept') return finishAppeal(body, id, true, '');

  if (action === 'appeal_deny') {
    // Ask for the reason the player will be shown.
    return NextResponse.json({
      type: 9,
      data: {
        custom_id: `appeal_denymodal:${id}`,
        title: 'Deny ban appeal',
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: 'note',
                label: 'Reason shown to the player',
                style: 2,
                min_length: 3,
                max_length: 800,
                required: true,
                placeholder: 'Why the ban stays in place',
              },
            ],
          },
        ],
      },
    });
  }
  return reply('Unknown appeal action.');
}

function handleAppealModal(body: Interaction & { data?: { custom_id?: string; components?: { components?: { custom_id?: string; value?: string }[] }[] } }) {
  if (!canReviewRoleRequests(body.member?.roles ?? [])) {
    return reply('Only Gold Command and management can decide ban appeals.');
  }
  const id = body.data?.custom_id?.split(':')[1];
  const note = body.data?.components?.flatMap((r) => r.components ?? []).find((c) => c.custom_id === 'note')?.value?.trim() ?? '';
  if (!id) return reply('Invalid appeal form.');
  return finishAppeal(body, id, false, note);
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
      if (customId?.startsWith('appeal_')) {
        return handleAppealButton(body, customId);
      }
      if (customId?.startsWith('training_left_')) {
        return handleTrainingLeft(body, customId);
      }
      const BUTTON_IDS = ['patrol_book_on', 'patrol_not_attending', 'training_attend', 'training_book_on', 'training_not_attending', 'training_cant_make_it'];
      if (!customId || !(BUTTON_IDS.includes(customId) || customId.startsWith('training_cant_make_it:'))) {
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

    // Modal submit (deny reason)
    if (body.type === 5 && String(body.data?.custom_id ?? '').startsWith('appeal_denymodal:')) {
      return handleAppealModal(body);
    }

    return NextResponse.json({ error: 'Invalid interaction type' }, { status: 400 });
  } catch (err) {
    console.error('Interaction verification error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}