'use server';

import { revalidatePath } from 'next/cache';
import { getPortalUser, supabaseAdmin } from '@/lib/portal';
import { TRAININGS_CHANNEL_ID, deleteMessage, editMessage, postMessage } from '@/lib/discord';
import { trainingPayload } from '@/lib/embeds';
import { londonLocalToUtc } from '@/lib/london-time';
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
  if (!user?.isManagement) return fail('You do not have permission to post trainings.');

  const title = field(formData, 'title', 100);
  const date = field(formData, 'date', 10);
  const startTime = field(formData, 'startTime', 5);
  const endTime = field(formData, 'endTime', 5);
  const divisionId = field(formData, 'divisionId', 60) || null;
  const description = field(formData, 'description', 1500);
  const imageUrl = field(formData, 'imageUrl', 500);
  const ping = formData.get('ping') === 'on';

  if (!title) return fail('Give the training a title.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail('Pick a valid date.');
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) return fail('Pick a start and end time.');
  if (imageUrl && !/^https:\/\//i.test(imageUrl)) return fail('Image URL must start with https://');

  const startsAt = londonLocalToUtc(date, startTime);
  const endsAt = londonLocalToUtc(date, endTime);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return fail('Invalid date or time.');
  if (endsAt <= startsAt) return fail('End time must be after the start time.');

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
      attending: [],
      unattending: [],
    })
    .select('*')
    .single();

  if (error || !row) {
    console.error('Training insert failed:', error);
    return fail('Could not save the training. Have you run the SQL in supabase/trainings-divisions.sql?');
  }

  const training = row as Training;
  const messageId = await postMessage(TRAININGS_CHANNEL_ID, {
    ...(ping ? { content: '@everyone' } : {}),
    ...trainingPayload(training, await divisionName(divisionId)),
    allowed_mentions: ping ? { parse: ['everyone'] } : { parse: [] },
  });

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
      ? `${training.id} posted to the website and Discord.`
      : `${training.id} saved, but posting to Discord failed (check the bot token and channel permissions).`,
  };
}

export async function setTrainingAttendance(
  trainingId: string,
  status: 'attending' | 'unattending'
): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user) return fail('Please log in again.');

  const { data } = await supabaseAdmin.from('trainings').select('*').eq('id', trainingId).maybeSingle();
  if (!data) return fail('Training not found.');
  const training = data as Training;

  if (new Date(training.ends_at) < new Date()) return fail('This training has already finished.');

  const attending = training.attending.filter((n) => n !== user.name);
  const unattending = training.unattending.filter((n) => n !== user.name);
  (status === 'attending' ? attending : unattending).push(user.name);

  const { error } = await supabaseAdmin.from('trainings').update({ attending, unattending }).eq('id', trainingId);
  if (error) return fail('Could not update your attendance.');

  if (training.discord_message_id) {
    await editMessage(
      training.discord_channel_id || TRAININGS_CHANNEL_ID,
      training.discord_message_id,
      trainingPayload({ ...training, attending, unattending }, await divisionName(training.division_id))
    );
  }

  revalidatePath('/dashboard/trainings');
  return { ok: true, message: status === 'attending' ? 'Booked on.' : 'Marked as not attending.' };
}

export async function deleteTraining(trainingId: string): Promise<ActionResult> {
  const user = await getPortalUser();
  if (!user?.isManagement) return fail('You do not have permission to delete trainings.');

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
