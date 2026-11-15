import { supabaseAdmin } from '@/lib/portal';
import { TRAININGS_CHANNEL_ID, editMessage, sendDm } from '@/lib/discord';
import { trainingCompleteDmPayload, trainingPayload } from '@/lib/embeds';
import type { Training } from '@/lib/portal-types';

export type CompleteResult =
  | { ok: true; training: Training; dmSent: boolean; dmTo: string | null }
  | { ok: false; message: string };

/**
 * Marks a training complete, updates the Discord post and DMs the instructor the "did anyone leave?" question.
 * Used by the Complete button and by the automatic "everyone left the room" check.
 * `fallbackDmId` is who gets the DM when no instructor ID is stored (the person who pressed Complete).
 */
export async function markTrainingComplete(trainingId: string, completedBy: string, fallbackDmId?: string | null): Promise<CompleteResult> {
  const { data: row, error } = await supabaseAdmin
    .from('trainings')
    .update({ completed_at: new Date().toISOString(), completed_by: completedBy })
    .eq('id', trainingId)
    .is('completed_at', null)
    .select('*')
    .single();
  if (error || !row) {
    console.error('Training complete failed:', error);
    return { ok: false, message: 'Could not mark it complete. Run supabase/training-complete.sql (adds the completed columns) in Supabase.' };
  }
  const training = row as Training;

  if (training.discord_message_id) {
    let divName: string | null = null;
    if (training.division_id) {
      const { data: div } = await supabaseAdmin.from('divisions').select('name').eq('id', training.division_id).maybeSingle();
      divName = div?.name ?? null;
    }
    await editMessage(training.discord_channel_id || TRAININGS_CHANNEL_ID, training.discord_message_id, trainingPayload(training, divName));
  }

  const dmTo = training.host_id || fallbackDmId || null;
  const dmSent = dmTo ? await sendDm(dmTo, trainingCompleteDmPayload(training, (training.attending_ids ?? []).length)) : false;
  return { ok: true, training, dmSent, dmTo };
}
