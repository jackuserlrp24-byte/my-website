import { supabaseAdmin } from '@/lib/portal';
import { REQUIREMENT_MESSAGE, meetsTrainingRequirements } from '@/lib/training-config';
import type { Training } from '@/lib/portal-types';

export type BookResult =
  | { status: 'booked'; training: Training }
  | { status: 'already'; training: Training }
  | { status: 'blocked' | 'finished' | 'error'; message: string };

/** Shared by the website button and the Discord button so both enforce the same rules. */
export async function bookOnTraining(
  training: Training,
  userName: string,
  roles: string[]
): Promise<BookResult> {
  if (new Date(training.ends_at) < new Date()) {
    return { status: 'finished', message: 'This training has already finished.' };
  }
  if (training.requires_ipp && !meetsTrainingRequirements(roles)) {
    return { status: 'blocked', message: REQUIREMENT_MESSAGE };
  }
  if (training.attending.includes(userName)) {
    return { status: 'already', training };
  }

  const attending = [...training.attending, userName];
  const { error } = await supabaseAdmin.from('trainings').update({ attending }).eq('id', training.id);
  if (error) return { status: 'error', message: 'Could not save your booking. Try again.' };

  return { status: 'booked', training: { ...training, attending } };
}
