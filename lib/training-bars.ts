import { supabaseAdmin } from '@/lib/portal';

export interface ActiveBar {
  reason: string | null;
  barred_by: string;
  training_title: string | null;
}

/** The person's active bar for this kind of training, or null. Never throws (table missing = nobody is barred). */
export async function getActiveBar(discordId: string | undefined, trainingKey: string): Promise<ActiveBar | null> {
  if (!discordId) return null;
  try {
    const { data, error } = await supabaseAdmin
      .from('training_bars')
      .select('reason, barred_by, training_title')
      .eq('discord_id', discordId)
      .eq('training_key', trainingKey)
      .is('lifted_at', null)
      .maybeSingle();
    if (error) return null;
    return (data as ActiveBar | null) ?? null;
  } catch {
    return null;
  }
}

/** A new training of this kind was posted: every bar for that kind ends. Returns how many were lifted. Never throws. */
export async function liftBarsForKey(trainingKey: string, by: string): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin
      .from('training_bars')
      .update({ lifted_at: new Date().toISOString(), lifted_by: by })
      .eq('training_key', trainingKey)
      .is('lifted_at', null)
      .select('id');
    if (error) return 0;
    return data?.length ?? 0;
  } catch {
    return 0;
  }
}
