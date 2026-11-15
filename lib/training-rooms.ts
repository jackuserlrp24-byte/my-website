import { supabaseAdmin } from '@/lib/portal';
import { TRAINING_ROOM_IDS } from '@/lib/training-config';

/**
 * Picks the first training room that no other live training is using at that time.
 * Returns null if no rooms are configured (DISCORD_TRAINING_ROOM_IDS) or every room is taken.
 */
export async function pickFreeRoom(startsAtIso: string, endsAtIso: string, excludeId?: string): Promise<string | null> {
  if (!TRAINING_ROOM_IDS.length) return null;
  try {
    let q = supabaseAdmin
      .from('trainings')
      .select('id, room_id')
      .in('room_id', TRAINING_ROOM_IDS)
      .is('cancelled_at', null)
      .is('completed_at', null)
      .lt('starts_at', endsAtIso)
      .gt('ends_at', startsAtIso);
    if (excludeId) q = q.neq('id', excludeId);
    const { data, error } = await q;
    if (error) return null; // room columns not added yet (run supabase/training-rooms.sql)
    const taken = new Set((data ?? []).map((r) => r.room_id as string));
    return TRAINING_ROOM_IDS.find((id) => !taken.has(id)) ?? null;
  } catch {
    return null;
  }
}
