import { supabaseAdmin } from '@/lib/portal';
import { REQUIREMENT_MESSAGE, meetsTrainingRequirements } from '@/lib/training-config';
import type { Training } from '@/lib/portal-types';

export type BookResult =
  | { status: 'booked'; training: Training }
  | { status: 'already'; training: Training }
  | { status: 'blocked' | 'finished' | 'error'; message: string };

export type CantMakeResult =
  | { status: 'removed'; training: Training }
  | { status: 'already'; training: Training }
  | { status: 'not_booked' | 'finished' | 'error'; message: string };

/**
 * Puts the booking on the person's training record (the same met_training_records table the Met Police
 * command dossier reads). One row per person per training, so pressing Attend twice never duplicates it.
 * Never throws - a record problem must not stop someone booking.
 */
async function registerTrainingRecord(training: Training, discordId: string | undefined) {
  if (!discordId) return;
  try {
    const when = new Date(training.starts_at).toLocaleString('en-GB', { timeZone: 'Europe/London', dateStyle: 'medium', timeStyle: 'short' });
    const { error } = await supabaseAdmin.from('met_training_records').upsert(
      {
        training_id: training.id,
        training_name: training.title,
        target_discord_id: discordId,
        notes: `Booked on ${training.id} (${when} UK)${training.host ? ` - hosted by ${training.host}` : ''}.`,
        issuer_name: training.host || 'Training booking',
      },
      { onConflict: 'training_id,target_discord_id', ignoreDuplicates: true }
    );
    if (error) console.error('Training record insert failed (run supabase/full-setup.sql):', error.message);
  } catch (err) {
    console.error('Training record error:', err);
  }
}

/** Removes the auto-logged record when someone later says they can't make it. */
async function removeTrainingRecord(trainingId: string, discordId: string | undefined) {
  if (!discordId) return;
  try {
    await supabaseAdmin.from('met_training_records').delete().eq('training_id', trainingId).eq('target_discord_id', discordId);
  } catch (err) {
    console.error('Training record removal error:', err);
  }
}

/** Shared by the website button and the Discord button so both enforce the same rules. */
export async function bookOnTraining(
  training: Training,
  userName: string,
  roles: string[],
  discordId?: string
): Promise<BookResult> {
  if (new Date(training.ends_at) < new Date()) {
    return { status: 'finished', message: 'This training has already finished.' };
  }
  if (training.cancelled_at) {
    return { status: 'blocked', message: 'This training has been cancelled.' };
  }
  if (training.completed_at) {
    return { status: 'finished', message: 'This training has already been completed.' };
  }
  if (training.requires_ipp && !meetsTrainingRequirements(roles)) {
    return { status: 'blocked', message: REQUIREMENT_MESSAGE };
  }
  if (training.attending.includes(userName)) {
    await registerTrainingRecord(training, discordId); // backfills people who booked before records existed
    return { status: 'already', training };
  }

  const attending = [...training.attending, userName];
  const attendingIds = discordId
    ? Array.from(new Set([...(training.attending_ids ?? []), discordId]))
    : training.attending_ids ?? [];
  // Booking on again cancels an earlier "can't make it".
  const unattending = (training.unattending ?? []).filter((n) => n !== userName);

  const { error } = await supabaseAdmin
    .from('trainings')
    .update({ attending, attending_ids: attendingIds, unattending })
    .eq('id', training.id);
  if (error) return { status: 'error', message: 'Could not save your booking. Try again.' };

  await registerTrainingRecord(training, discordId);

  return { status: 'booked', training: { ...training, attending, attending_ids: attendingIds, unattending } };
}

/** "Can't make it": takes a booked student off the attending list and logs them as unable to attend. */
export async function cantMakeTraining(
  training: Training,
  userName: string,
  discordId?: string
): Promise<CantMakeResult> {
  if (new Date(training.ends_at) < new Date()) {
    return { status: 'finished', message: 'This training has already finished.' };
  }
  if ((training.unattending ?? []).includes(userName) && !training.attending.includes(userName)) {
    return { status: 'already', training };
  }
  if (!training.attending.includes(userName)) {
    return { status: 'not_booked', message: "You aren't booked on this training - press **Attend** first if you want a place." };
  }

  const attending = training.attending.filter((n) => n !== userName);
  const attendingIds = (training.attending_ids ?? []).filter((id) => id !== discordId);
  const unattending = [...(training.unattending ?? []), userName];

  const { error } = await supabaseAdmin
    .from('trainings')
    .update({ attending, attending_ids: attendingIds, unattending })
    .eq('id', training.id);
  if (error) return { status: 'error', message: 'Could not update your booking. Try again.' };

  await removeTrainingRecord(training.id, discordId);

  return { status: 'removed', training: { ...training, attending, attending_ids: attendingIds, unattending } };
}
