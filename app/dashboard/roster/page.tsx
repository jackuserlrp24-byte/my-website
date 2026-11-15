import { redirect } from 'next/navigation';
import { getPortalUser } from '@/lib/portal';
import { getRoster } from '@/lib/roster';

export const dynamic = 'force-dynamic';

export default async function RosterPage() {
  const user = await getPortalUser();
  if (!user) redirect('/');
  if (!user.isManagement) redirect('/dashboard'); // Management + Ownership only

  const { groups, total, error } = await getRoster();
  const listed = groups.reduce((n, g) => n + g.members.length, 0);

  return (
    <main className="flex flex-col px-8 mt-6 max-w-[1100px] mx-auto w-full gap-6 pb-16 select-none antialiased">
      <div className="w-full bg-neutral-900 border border-neutral-800 p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#5865F2]" />
        <span className="text-[10px] font-mono text-[#5865F2] tracking-widest uppercase block mb-1">MANAGEMENT</span>
        <h2 className="text-2xl font-bold tracking-tight text-neutral-100">Server Roster</h2>
        <p className="text-xs text-neutral-400 mt-1">
          {error ? 'Live from Discord.' : `${listed} leadership, command and staff members (of ${total} in the server). Live from Discord.`}
        </p>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 p-4 text-xs font-mono text-red-300">{error}</div>}

      {groups
        .filter((g) => g.members.length > 0)
        .map((g) => (
          <section key={g.key} className="flex flex-col gap-2">
            <h3 className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest">
              {g.label} <span className="text-neutral-600">({g.members.length})</span>
            </h3>
            <div className="bg-neutral-900 border border-neutral-800 divide-y divide-neutral-800">
              {g.members.map((m) => (
                <div key={m.id} className="px-5 py-3 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.avatarUrl} alt="" className="w-8 h-8 rounded-full border border-neutral-700" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-neutral-100 truncate">{m.name}</p>
                    <p className="text-[11px] font-mono text-neutral-500 truncate">
                      {m.rpName ? `${m.rpName}${m.collar ? ` - ${m.collar}` : ''}` : 'No RP profile'}
                    </p>
                  </div>
                  <div className="hidden md:flex flex-wrap justify-end gap-1 max-w-[50%]">
                    {m.roleNames.map((r) => (
                      <span key={r} className="px-2 py-0.5 text-[10px] font-mono text-neutral-400 border border-neutral-700 bg-neutral-950">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
    </main>
  );
}
