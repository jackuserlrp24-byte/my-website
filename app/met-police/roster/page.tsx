import { getOfficer } from '@/lib/met-access';
import { getMetRoster } from '@/lib/met-discord';
import { ui } from '@/lib/met-util';
import AutoRefresh from '../AutoRefresh';

export const dynamic = 'force-dynamic';

export default async function RosterPage() {
  const officer = (await getOfficer())!;
  const { rows, error } = await getMetRoster();

  const tiers = Array.from(new Set(rows.map((r) => r.tier)));

  return (
    <div className="space-y-8">
      <AutoRefresh seconds={60} />
      <div>
        <h1 className={ui.h1}>Roster</h1>
        <p className={ui.sub}>
          Command team, {rows.length} in total. It updates by itself from the Discord command roles; collar numbers and ranks are copied from Discord.
        </p>
      </div>

      {error && <p className={ui.warn}>{error}</p>}
      {!error && rows.length === 0 && <p className={ui.empty}>Nobody holds a command role yet.</p>}

      {tiers.map((tier) => {
        const members = rows.filter((r) => r.tier === tier);
        return (
          <section key={tier} className="space-y-3">
            <h2 className={ui.eyebrow}>{tier} ({members.length})</h2>
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
                  {members.map((r) => (
                    <tr key={r.id} className={r.id === officer.id ? 'bg-blue-50/60' : ''}>
                      <td className="px-4 py-2 font-mono text-slate-600">{r.collar || '-'}</td>
                      <td className="px-4 py-2 font-medium text-slate-900">
                        {r.name}
                        {r.id === officer.id && <span className="ml-2 text-xs text-slate-400">(you)</span>}
                      </td>
                      <td className="px-4 py-2 text-slate-600">{r.rank || '-'}</td>
                      <td className="px-4 py-2 text-slate-600">{r.station || '-'}</td>
                      <td className="px-4 py-2 text-slate-600">{r.team || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
