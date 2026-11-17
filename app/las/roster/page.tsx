import { getLasMember } from '@/lib/las-access';
import { getLasRoster } from '@/lib/las-discord';
import { ui } from '@/lib/met-util';
import AutoRefresh from '@/app/met-police/AutoRefresh';

export const dynamic = 'force-dynamic';

export default async function LasRosterPage() {
  const member = (await getLasMember())!;
  const { rows, error } = await getLasRoster();
  const tiers = Array.from(new Set(rows.map((r) => r.tier)));

  return (
    <div className="space-y-8">
      <AutoRefresh seconds={60} />
      <div>
        <h1 className={ui.h1}>Chain of Command</h1>
        <p className={ui.sub}>{rows.length} in total. It updates by itself from the Discord roles; numbers and ranks are copied from Discord.</p>
      </div>

      {error && <p className={ui.warn}>{error}</p>}
      {!error && rows.length === 0 && <p className={ui.empty}>Nobody holds an LAS command role yet.</p>}

      {tiers.map((tier) => {
        const members = rows.filter((r) => r.tier === tier);
        return (
          <section key={tier} className="space-y-3">
            <h2 className={ui.eyebrow}>{tier} ({members.length})</h2>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className={ui.th}>Number</th>
                    <th className={ui.th}>Name</th>
                    <th className={ui.th}>Rank</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((r) => (
                    <tr key={r.id} className={r.id === member.id ? 'bg-emerald-50/70' : ''}>
                      <td className="px-4 py-2 font-mono text-slate-600">{r.callsign || '-'}</td>
                      <td className="px-4 py-2 font-medium text-slate-900">
                        {r.name}
                        {r.id === member.id && <span className="ml-2 text-xs text-slate-400">(you)</span>}
                      </td>
                      <td className="px-4 py-2 text-slate-600">{r.rank || '-'}</td>
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
