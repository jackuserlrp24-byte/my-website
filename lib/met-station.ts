import { supabaseAdmin } from '@/lib/portal';
import { FRONTLINE_STATIONS, forcedStation } from '@/lib/met-discord';

/**
 * The station an officer should have.
 *  - Gold Command            -> New Scotland Yard
 *  - MO7 / MO8               -> Chadwell Heath Police Base
 *  - everyone else (Frontline) -> Plumstead or Bexleyheath, whichever has fewer officers right now (ties go to Plumstead),
 *    so the two stations stay equal. Once an officer has a station it is kept, so they are not moved around.
 */
export async function stationFor(roles: string[], saved: string | null): Promise<string> {
  const forced = forcedStation(roles);
  if (forced) return forced;
  if (saved && FRONTLINE_STATIONS.includes(saved)) return saved;

  const counts = new Map<string, number>(FRONTLINE_STATIONS.map((n) => [n, 0]));
  try {
    const { data } = await supabaseAdmin.from('met_officer_details').select('station').in('station', FRONTLINE_STATIONS).limit(5000);
    for (const r of data ?? []) counts.set(r.station, (counts.get(r.station) ?? 0) + 1);
  } catch {}
  return [...FRONTLINE_STATIONS].sort((a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0))[0];
}
