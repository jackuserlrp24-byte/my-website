import { supabaseAdmin } from '@/lib/portal';

/**
 * Gives an officer their own warrant number the first time it is needed:
 * a random 6-digit number, kept forever. Duplicates are impossible because the database has a unique
 * index on warrant_card (sql/warrant_unique.sql): if a number is taken, or another request set one
 * first, the write fails, we loop, re-read, and try a new number.
 */
export async function getOrCreateWarrant(id: string): Promise<string | null> {
  for (let i = 0; i < 12; i++) {
    const { data: row } = await supabaseAdmin.from('met_officer_details').select('warrant_card').eq('discord_id', id).maybeSingle();
    if (row?.warrant_card) return String(row.warrant_card);

    const n = String(Math.floor(100000 + Math.random() * 900000));
    if (row) {
      await supabaseAdmin.from('met_officer_details').update({ warrant_card: n }).eq('discord_id', id).or('warrant_card.is.null,warrant_card.eq.');
    } else {
      await supabaseAdmin.from('met_officer_details').insert({ discord_id: id, warrant_card: n });
    }
  }
  return null;
}
