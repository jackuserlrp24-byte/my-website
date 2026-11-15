import { supabaseAdmin } from '@/lib/portal';
import { londonToday } from '@/lib/london-time';
import { syncDivisionsEmbed } from '@/lib/divisions-sync';

/**
 * Closes every OPEN division whose "closes on" day (UK time) has finished, clears the date,
 * and refreshes the Discord status embed. Safe to call as often as you like.
 * Returns how many divisions were closed.
 */
export async function closeExpiredDivisions(): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin
      .from('divisions')
      .update({ status: 'closed', closes_on: null, updated_by: 'Auto (deadline reached)', updated_at: new Date().toISOString() })
      .eq('status', 'open')
      .lt('closes_on', londonToday())
      .select('id');
    if (error) return 0; // column not added yet -> do nothing
    const n = data?.length ?? 0;
    if (n > 0) await syncDivisionsEmbed();
    return n;
  } catch (err) {
    console.error('closeExpiredDivisions failed:', err);
    return 0;
  }
}
