'use server';

import { revalidatePath } from 'next/cache';
import { getPortalUser, supabaseAdmin } from '@/lib/portal';
import { TRAININGS_CHANNEL_ID, deleteMessage, editMessage, getGuildMember, postMessage, sendDm } from '@/lib/discord';
import { trainingCancelDmPayload, trainingCompleteDmPayload, trainingDelayDmPayload, trainingDmPayload, trainingPayload } from '@/lib/embeds';
import { bookOnTraining, cantMakeTraining } from '@/lib/training-attend';
import { isLateNightLondon, londonLocalToUtc } from '@/lib/london-time';
import { TRAINING_PING_ROLE_ID, TRAINING_ROOM_IDS } from '@/lib/training-config';
import { markTrainingComplete } from '@/lib/training-complete';
import { pickFreeRoom } from '@/lib/training-rooms';
import { liftBarsForKey } from '@/lib/training-bars';
import { trainingKey } from '@/lib/training-key';
import { TRAINING_TEMPLATES } from '@/lib/training-templates';
import type { ActionResult, Training } from '@/lib/portal-types';

const fail = (message: string): ActionResult => ({ ok: false, message });
const field = (fd: FormData, key: string, max: number) => String(fd.get(key) ?? '').trim().slice(0, max);

async function divisionName(id: string | null): Promise<string | null> {
  if (!id) return null;
  const { data } = await supabaseAdmin.from('divisions').select('name').eq('id', id).maybeSingle();
  return data?.name ?? null;
}

export async function createTraining(formData: FormData): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user?.isTrainer) return fail('Only trainers can post trainings.');

  const title = field(formData, 'title', 100);
  const date = field(formData, 'date', 10);
  const startTime = field(formData, 'startTime', 5);
  const divisionId = field(formData, 'divisionId', 60) || null;
  const description = field(formData, 'description', 1500);
  const imageUrl = field(formData, 'imageUrl', 500);
  const ping = formData.get('ping') === 'on';
  const requiresIpp = formData.get('requiresIpp') === 'on';

  if (!title) return fail('Give the training a title.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail('Pick a valid date.');
  if (!/^\d{2}:\d{2}$/.test(startTime)) return fail('Pick a start time.');
  if (imageUrl && !/^https:\/\//i.test(imageUrl)) return fail('Image URL must start with https://');

  const startsAt = londonLocalToUtc(date, startTime);
  if (Number.isNaN(startsAt.getTime())) return fail('Invalid date or time.');
  // No end time on the form: it's the template's length (default 60 min) so rooms and "finished" checks still work.
  const tplKey = field(formData, 'templateKey', 60);
  const durationMins = TRAINING_TEMPLATES.find((t) => t.key === tplKey)?.durationMins ?? 60;
  const endsAt = new Date(startsAt.getTime() + durationMins * 60000);

  const { data: row, error } = await supabaseAdmin
    .from('trainings')
    .insert({
      title,
      division_id: divisionId,
      host: user.name,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      description: description || null,
      image_url: imageUrl || null,
      requires_ipp: requiresIpp,
      attending: [],
    })
    .select('*')
    .single();

  if (error || !row) {
    console.error('Training insert failed:', error);
    return fail('Could not save the training. Have you run the SQL in supabase/trainings-divisions.sql?');
  }

  const training = row as Training;
  // Remember which template it came from, and posting a new training of this kind ends everyone's bar for that kind.
  const templateKeyInput = field(formData, 'templateKey', 60);
  const templateKey = TRAINING_TEMPLATES.some((t) => t.key === templateKeyInput) ? templateKeyInput : null;
  if (templateKey) await supabaseAdmin.from('trainings').update({ template_key: templateKey }).eq('id', training.id);
  const liftedBars = await liftBarsForKey(trainingKey({ title: training.title, template_key: templateKey }), 'New training posted');
  // Remember who the instructor is (so the "did anyone leave?" DM reaches them). Best-effort: needs supabase/training-complete.sql.
  await supabaseAdmin.from('trainings').update({ host_id: user.id }).eq('id', training.id);
  // Assign a free training room (needs DISCORD_TRAINING_ROOM_IDS + supabase/training-rooms.sql).
  const roomId = await pickFreeRoom(training.starts_at, training.ends_at, training.id);
  if (roomId) {
    const { error: roomErr } = await supabaseAdmin.from('trainings').update({ room_id: roomId }).eq('id', training.id);
    if (!roomErr) training.room_id = roomId;
  }
  const silent = isLateNightLondon();
  const messageId = await postMessage(TRAININGS_CHANNEL_ID, {
    ...(ping ? { content: `<@&${TRAINING_PING_ROLE_ID}>` } : {}),
    ...trainingPayload(training, await divisionName(divisionId)),
    allowed_mentions: ping ? { roles: [TRAINING_PING_ROLE_ID] } : { parse: [] },
    ...(ping && silent ? { flags: 4096 } : {}), // SUPPRESS_NOTIFICATIONS: still tags the role, but no push / sound
  });

  // Tell the instructor which room they were given (by DM, not on the public post).
  if (training.room_id) {
    const roomNumber = TRAINING_ROOM_IDS.indexOf(training.room_id) + 1;
    await sendDm(user.id, {
      embeds: [
        {
          title: roomNumber > 0 ? `You've been assigned to Training Room ${roomNumber}` : "You've been assigned a training room",
          description: `**${training.title}** (${training.id}) will run in <#${training.room_id}>.`,
          color: 5763719,
          footer: { text: 'Central Operations Portal' },
        },
      ],
      allowed_mentions: { parse: [] },
    });
  }

  if (messageId) {
    await supabaseAdmin
      .from('trainings')
      .update({ discord_message_id: messageId, discord_channel_id: TRAININGS_CHANNEL_ID })
      .eq('id', training.id);
  }

  revalidatePath('/dashboard/trainings');
  return {
    ok: true,
    message: messageId
      ? `${training.id} posted to the website and Discord.${training.room_id ? ' Training room assigned.' : ''}${liftedBars ? ` ${liftedBars} bar${liftedBars === 1 ? '' : 's'} for this training lifted.` : ''}`
      : `${training.id} saved, but posting to Discord failed (check the bot token and channel permissions).`,
  };
}

export async function attendTraining(trainingId: string): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user) return fail('Please log in again.');

  const { data } = await supabaseAdmin.from('trainings').select('*').eq('id', trainingId).maybeSingle();
  if (!data) return fail('Training not found.');

  const result = await bookOnTraining(data as Training, user.name, user.roles, user.id);
  if (result.status === 'already') return { ok: true, message: 'You are already booked on this training.' };
  if (result.status !== 'booked') return fail(result.message);

  const training = result.training;
  const divName = await divisionName(training.division_id);

  if (training.discord_message_id) {
    await editMessage(
      training.discord_channel_id || TRAININGS_CHANNEL_ID,
      training.discord_message_id,
      trainingPayload(training, divName)
    );
  }

  const dmSent = await sendDm(user.id, trainingDmPayload(training, divName));

  revalidatePath('/dashboard/trainings');
  return {
    ok: true,
    message: dmSent
      ? 'Booked on. Check your Discord DMs for the details and which VC to wait in.'
      : 'Booked on, but I could not DM you - turn on DMs from server members so you get reminders.',
  };
}

export async function cantMakeTrainingAction(trainingId: string): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user) return fail('Please log in again.');

  const { data } = await supabaseAdmin.from('trainings').select('*').eq('id', trainingId).maybeSingle();
  if (!data) return fail('Training not found.');

  const result = await cantMakeTraining(data as Training, user.name, user.id);
  if (result.status === 'already') return { ok: true, message: "You're already marked as unable to make this training." };
  if (result.status !== 'removed') return fail(result.message.replace(/\*\*/g, ''));

  const training = result.training;
  if (training.discord_message_id) {
    await editMessage(
      training.discord_channel_id || TRAININGS_CHANNEL_ID,
      training.discord_message_id,
      trainingPayload(training, await divisionName(training.division_id))
    );
  }

  revalidatePath('/dashboard/trainings');
  return { ok: true, message: "Marked as can't make it. You've been taken off the attending list." };
}

const MAX_DELAY_MINUTES = 240;

/** Trainers only: push a training back by N minutes, update the Discord post and DM everyone booked on. */
export async function delayTraining(trainingId: string, minutes: number, reason: string): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user?.isTrainer) return fail('Only trainers can delay trainings.');

  const mins = Math.round(Number(minutes));
  if (!Number.isFinite(mins) || mins < 1 || mins > MAX_DELAY_MINUTES) {
    return fail(`Delay must be between 1 and ${MAX_DELAY_MINUTES} minutes.`);
  }
  const note = String(reason ?? '').trim().slice(0, 200);

  const { data } = await supabaseAdmin.from('trainings').select('*').eq('id', trainingId).maybeSingle();
  if (!data) return fail('Training not found.');
  const current = data as Training;
  if (new Date(current.ends_at) < new Date()) return fail('This training has already finished.');

  const shift = mins * 60 * 1000;
  const { data: row, error } = await supabaseAdmin
    .from('trainings')
    .update({
      starts_at: new Date(new Date(current.starts_at).getTime() + shift).toISOString(),
      ends_at: new Date(new Date(current.ends_at).getTime() + shift).toISOString(),
      delayed_minutes: (current.delayed_minutes ?? 0) + mins,
      delay_reason: note || current.delay_reason,
      original_starts_at: current.original_starts_at ?? current.starts_at,
    })
    .eq('id', trainingId)
    .select('*')
    .single();

  if (error || !row) {
    console.error('Training delay failed:', error);
    return fail('Could not delay the training. Have you run the latest supabase/full-setup.sql?');
  }

  const training = row as Training;
  const divName = await divisionName(training.division_id);

  if (training.discord_message_id) {
    const channel = training.discord_channel_id || TRAININGS_CHANNEL_ID;
    await editMessage(channel, training.discord_message_id, trainingPayload(training, divName));
    await postMessage(channel, {
      content: `**${training.id} delayed by ${mins} minutes.** New start: <t:${Math.floor(new Date(training.starts_at).getTime() / 1000)}:t> (<t:${Math.floor(new Date(training.starts_at).getTime() / 1000)}:R>).${note ? ` Reason: ${note}` : ''}`,
      message_reference: { message_id: training.discord_message_id, fail_if_not_exists: false },
      allowed_mentions: { parse: [] },
    });
  }

  const ids = training.attending_ids ?? [];
  const results = await Promise.all(ids.map((id) => sendDm(id, trainingDelayDmPayload(training, divName))));
  const dmd = results.filter(Boolean).length;

  revalidatePath('/dashboard/trainings');
  return {
    ok: true,
    message: `${training.id} delayed by ${mins} minutes. ${dmd} of ${ids.length} attendee${ids.length === 1 ? '' : 's'} DMed.`,
  };
}

/**
 * Gold Command + management: swap the instructor (host) of a training.
 * Accepts a Discord ID / @mention (name is looked up in the server) or just a typed name.
 */
export async function changeTrainingHost(trainingId: string, who: string): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user?.canSwapHost) return fail('Only Gold Command and management can change the instructor.');

  const input = String(who ?? '').trim().slice(0, 80);
  if (!input) return fail('Enter the new instructor (Discord ID or name).');

  let newHost = input;
  const idCandidate = input.replace(/[<@!>]/g, '');
  if (/^\d{17,20}$/.test(idCandidate)) {
    const member = await getGuildMember(idCandidate);
    if (!member) return fail('That user is not in the server.');
    newHost = member.name || member.username || idCandidate;
  }

  const { data } = await supabaseAdmin.from('trainings').select('*').eq('id', trainingId).maybeSingle();
  if (!data) return fail('Training not found.');
  const current = data as Training;
  if (new Date(current.ends_at) < new Date()) return fail('This training has already finished.');
  const oldHost = current.host || 'TBD';

  const { data: row, error } = await supabaseAdmin.from('trainings').update({ host: newHost }).eq('id', trainingId).select('*').single();
  if (error || !row) {
    console.error('Training host swap failed:', error);
    return fail('Could not change the instructor.');
  }

  const training = row as Training;
  // Keep the instructor's Discord ID in step with the host name (best-effort; needs supabase/training-complete.sql).
  await supabaseAdmin.from('trainings').update({ host_id: /^\d{17,20}$/.test(idCandidate) ? idCandidate : null }).eq('id', training.id);
  if (training.discord_message_id) {
    const channel = training.discord_channel_id || TRAININGS_CHANNEL_ID;
    await editMessage(channel, training.discord_message_id, trainingPayload(training, await divisionName(training.division_id)));
    await postMessage(channel, {
      content: `**${training.id} instructor changed:** ${oldHost} -> **${newHost}** (by ${user.name})`,
      message_reference: { message_id: training.discord_message_id, fail_if_not_exists: false },
      allowed_mentions: { parse: [] },
    });
  }

  revalidatePath('/dashboard/trainings');
  return { ok: true, message: `${training.id} instructor changed from ${oldHost} to ${newHost}.` };
}

/** Trainers only: cancel a session. Edits the Discord post, pings the role (silently overnight, UK time) and DMs everyone booked on. */
export async function cancelTraining(trainingId: string, reason: string): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user?.isTrainer) return fail('Only trainers can cancel trainings.');
  const note = String(reason ?? '').trim().slice(0, 200);

  const { data } = await supabaseAdmin.from('trainings').select('*').eq('id', trainingId).maybeSingle();
  if (!data) return fail('Training not found.');
  const current = data as Training;
  if (current.cancelled_at) return fail('This training is already cancelled.');
  if (new Date(current.ends_at) < new Date()) return fail('This training has already finished.');

  const { data: row, error } = await supabaseAdmin
    .from('trainings')
    .update({ cancelled_at: new Date().toISOString(), cancel_reason: note || null })
    .eq('id', trainingId)
    .select('*')
    .single();
  if (error || !row) {
    console.error('Training cancel failed:', error);
    return fail('Could not cancel the training. Run supabase/cancel-training.sql (adds the cancelled columns) in Supabase.');
  }

  const training = row as Training;
  const divName = await divisionName(training.division_id);
  const silent = isLateNightLondon();

  if (training.discord_message_id) {
    const channel = training.discord_channel_id || TRAININGS_CHANNEL_ID;
    await editMessage(channel, training.discord_message_id, trainingPayload(training, divName));
    await postMessage(channel, {
      content: `<@&${TRAINING_PING_ROLE_ID}> **${training.id} (${training.title}) has been cancelled.**${note ? ` Reason: ${note}` : ''}`,
      message_reference: { message_id: training.discord_message_id, fail_if_not_exists: false },
      allowed_mentions: { roles: [TRAINING_PING_ROLE_ID] },
      ...(silent ? { flags: 4096 } : {}), // SUPPRESS_NOTIFICATIONS: still tags the role, but no push / sound
    });
  }

  const ids = training.attending_ids ?? [];
  const results = await Promise.all(ids.map((id) => sendDm(id, trainingCancelDmPayload(training, divName))));
  const dmd = results.filter(Boolean).length;

  revalidatePath('/dashboard/trainings');
  revalidatePath('/dashboard/calendar');
  return {
    ok: true,
    message: `${training.id} cancelled. Role ${silent ? 'pinged silently (late night)' : 'pinged'}, ${dmd} of ${ids.length} attendee${ids.length === 1 ? '' : 's'} DMed.`,
  };
}

export async function deleteTraining(trainingId: string): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user?.isTrainer) return fail('Only trainers can delete trainings.');

  const { data } = await supabaseAdmin.from('trainings').select('*').eq('id', trainingId).maybeSingle();
  if (!data) return fail('Training not found.');
  const training = data as Training;

  if (training.discord_message_id) {
    await deleteMessage(training.discord_channel_id || TRAININGS_CHANNEL_ID, training.discord_message_id);
  }
  await supabaseAdmin.from('trainings').delete().eq('id', trainingId);

  revalidatePath('/dashboard/trainings');
  return { ok: true, message: `${trainingId} deleted.` };
}

/**
 * Trainers only: mark a session complete. Updates the Discord post and DMs the instructor asking whether anyone
 * left during it (Yes -> they pick who, and that person's training record is removed). Needs supabase/training-complete.sql.
 */
export async function completeTraining(trainingId: string): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user?.isTrainer) return fail('Only trainers can complete trainings.');

  const { data } = await supabaseAdmin.from('trainings').select('*').eq('id', trainingId).maybeSingle();
  if (!data) return fail('Training not found.');
  const current = data as Training;
  if (current.cancelled_at) return fail('This training was cancelled.');
  if (current.completed_at) return fail('This training is already marked complete.');
  if (new Date(current.starts_at).getTime() > Date.now()) return fail("This training hasn't started yet.");

  const out = await markTrainingComplete(trainingId, user.name, user.id);
  if (!out.ok) return fail(out.message);
  const training = out.training;
  const toSomeoneElse = out.dmTo !== user.id;
  const dmSent = out.dmSent;

  revalidatePath('/dashboard/trainings');
  revalidatePath('/dashboard/calendar');
  return {
    ok: true,
    message: dmSent
      ? `${training.id} marked complete. ${toSomeoneElse ? 'The instructor has' : 'You have'} been DMed to ask if anyone left.`
      : `${training.id} marked complete, but the DM could not be sent (DMs from server members must be on).`,
  };
}
