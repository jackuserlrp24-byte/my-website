import { getOfficer } from '@/lib/met-access';
import { supabaseAdmin } from '@/lib/portal';
import { ui } from '@/lib/met-util';

export const dynamic = 'force-dynamic';

interface Row {
  discord_id: string;
  rp_name: string | null;
  collar: string | null;
  rank: string | null;
  station: string | null;
  team: string | null;
}

export default async function RosterPage() {
  const officer = (await getOfficer())!;

  const [wl, det] = await Promise.all([
    supabaseAdmin.from('user_whitelists').select('discord_id, rp_name, collar_number').limit(2000),
    supabaseAdmin.from('met_officer_details').select('discord_id, rank, station, team').limit(2000),
  ]);

  const details = new Map((det.data ?? []).map((d) => [String(d.discord_id), d]));
  const rows: Row[] = (wl.data ?? [])
    .filter((w) => w.discord_id)
    .map((w) => {
      const id = String(w.discord_id);
      const d = details.get(id);
      return {
        discord_id: id,
        rp_name: w.rp_name ?? null,
        collar: w.collar_number != null ? String(w.collar_number) : null,
        rank: d?.rank ?? null,
        station: d?.station ?? null,
        team: d?.team ?? null,
      };
    })
    .sort((a, b) => {
      const ca = a.collar ? parseInt(a.collar, 10) : Number.MAX_SAFE_INTEGER;
      const cb = b.collar ? parseInt(b.collar, 10) : Number.MAX_SAFE_INTEGER;
      return ca - cb || (a.rp_name ?? '').localeCompare(b.rp_name ?? '');
    });


  return (
    <div className="space-y-6">
      <div>
        <h1 className={ui.h1}>Roster</h1>
        <p className={ui.sub}>
          Every officer in the Met, {rows.length} in total. Rank, station and team are set by command.
        </p>
      </div>

      {wl.error && <p className={ui.warn}>Could not read the officer list.</p>}

      {rows.length === 0 ? (
        <p className={ui.empty}>No officers on the roster yet.</p>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className={ui.th}>Collar</th>
                <th className={ui.th}>Officer</th>
                <th className={ui.th}>Rank</th>
                <th className={ui.th}>Station</th>
                <th className={ui.th}>Team</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.discord_id} className={r.discord_id === officer.id ? 'bg-blue-50/60' : ''}>
                  <td className="px-4 py-2 font-mono text-slate-600">{r.collar || '-'}</td>
                  <td className="px-4 py-2 font-medium text-slate-900">
                    {r.rp_name || 'Unknown'}
                    {r.discord_id === officer.id && <span className="ml-2 text-xs text-slate-400">(you)</span>}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{r.rank || '-'}</td>
                  <td className="px-4 py-2 text-slate-600">{r.station || '-'}</td>
                  <td className="px-4 py-2 text-slate-600">{r.team || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
