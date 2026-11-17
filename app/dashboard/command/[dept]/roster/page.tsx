import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getPortalUser } from '@/lib/portal';
import { COMMAND_DEPARTMENTS, canOpenDepartment } from '@/lib/departments';
import { getLasRoster } from '@/lib/las-discord';
import AutoRefresh from '@/app/met-police/AutoRefresh';

export const dynamic = 'force-dynamic';

// Roster for a department command suite. Only LAS has one for now (/dashboard/command/las/roster).
export default async function DepartmentRosterPage({ params }: { params: Promise<{ dept: string }> }) {
  const { dept: slug } = await params;
  const dept = COMMAND_DEPARTMENTS[slug];
  if (!dept || slug !== 'las') notFound();

  const user = await getPortalUser();
  if (!user) redirect('/');
  if (!canOpenDepartment(user.roles, user.isManagement, dept)) redirect('/dashboard/command');

  const { rows, error } = await getLasRoster();
  const tiers = Array.from(new Set(rows.map((r) => r.tier)));

  return (
    <main className="flex flex-col px-8 mt-4 max-w-[1100px] mx-auto w-full gap-6 pb-16 select-none antialiased font-mono">
      <AutoRefresh seconds={60} />
      <div className="w-full bg-neutral-900 border border-neutral-800 p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className={`absolute top-0 left-0 right-0 h-1 ${dept.accent}`} />
        <div>
          <span className="text-[10px] text-[#5865F2] tracking-widest uppercase block mb-1">{dept.short} Command Suite</span>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-100">Roster</h2>
          <p className="text-xs text-neutral-400 mt-1 font-sans">
            {rows.length} in total. It updates by itself from the Discord roles; numbers and ranks are copied from Discord.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/command/${slug}`} className="px-4 py-2 border border-neutral-700 hover:bg-neutral-800 text-neutral-300 text-[11px] uppercase tracking-wider">
            &larr; {dept.short} suite
          </Link>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 p-4 text-xs text-red-300">{error}</div>}
      {!error && rows.length === 0 && (
        <div className="border border-dashed border-neutral-800 px-4 py-10 text-center text-xs text-neutral-500">Nobody holds an LAS command role yet.</div>
      )}

      {tiers.map((tier) => {
        const members = rows.filter((r) => r.tier === tier);
        return (
          <section key={tier} className="flex flex-col gap-2">
            <h3 className="text-[11px] text-neutral-400 uppercase tracking-widest">
              {tier} <span className="text-neutral-600">({members.length})</span>
            </h3>
            <div className="bg-neutral-900 border border-neutral-800 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-[10px] uppercase tracking-wider text-neutral-500 border-b border-neutral-800">
                  <tr>
                    <th className="px-5 py-3">Number</th>
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Rank</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {members.map((r) => (
                    <tr key={r.id} className={r.id === user.id ? 'bg-emerald-500/5' : ''}>
                      <td className="px-5 py-2.5 text-neutral-400">{r.callsign || '-'}</td>
                      <td className="px-5 py-2.5 font-semibold text-neutral-100">
                        {r.name}
                        {r.id === user.id && <span className="ml-2 text-[10px] text-neutral-500">(you)</span>}
                      </td>
                      <td className="px-5 py-2.5 text-neutral-400">{r.rank || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </main>
  );
}
