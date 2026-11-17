import { redirect } from 'next/navigation';
import { getPortalUser, supabaseAdmin } from '@/lib/portal';
import LocalTime from '@/app/components/LocalTime';
import type { ModerationLog } from '@/lib/portal-types';

export const dynamic = 'force-dynamic';

type Row = { name: string; WARN: number; KICK: number; BAN: number; UNBAN: number; NOTE: number; total: number; last: string };

export default async function StaffActivityPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const user = await getPortalUser();
  if (!user) redirect('/');
  if (!user.canStaff) redirect('/dashboard');

  const { days: daysParam } = await searchParams;
  const days = [7, 30, 90].includes(Number(daysParam)) ? Number(daysParam) : 30;
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const { data, error } = await supabaseAdmin
    .from('moderation_logs')
    .select('moderator_name, action_type, created_at, discord_id, username, reason')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(3000);
  const logs = (data ?? []) as Pick<ModerationLog, 'moderator_name' | 'action_type' | 'created_at' | 'discord_id' | 'username' | 'reason'>[];

  const byMod = new Map<string, Row>();
  const byDay = new Map<string, number>();
  const byTarget = new Map<string, { name: string; n: number }>();
  for (const l of logs) {
    const name = l.moderator_name || 'Unknown';
    const r = byMod.get(name) ?? { name, WARN: 0, KICK: 0, BAN: 0, UNBAN: 0, NOTE: 0, total: 0, last: l.created_at };
    r[l.action_type] += 1;
    r.total += 1;
    if (l.created_at > r.last) r.last = l.created_at;
    byMod.set(name, r);

    const day = l.created_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);

    if (l.action_type !== 'NOTE' && l.action_type !== 'UNBAN') {
      const t = byTarget.get(l.discord_id) ?? { name: l.username || l.discord_id, n: 0 };
      t.n += 1;
      byTarget.set(l.discord_id, t);
    }
  }
  const rows = Array.from(byMod.values()).sort((a, b) => b.total - a.total);
  const repeat = Array.from(byTarget.entries())
    .filter(([, t]) => t.n >= 3)
    .sort((a, b) => b[1].n - a[1].n)
    .slice(0, 10);
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86400_000).toISOString().slice(0, 10);
    return { d, n: byDay.get(d) ?? 0 };
  });
  const peak = Math.max(1, ...last14.map((x) => x.n));

  const tab = (n: number) =>
    `px-4 py-2 text-xs font-mono font-medium uppercase tracking-wider ${n === days ? 'bg-[#5865F2] text-white' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'}`;

  return (
    <main className="flex flex-col w-full gap-6 pb-16 select-none antialiased">
      <div className="w-full bg-neutral-900 border border-neutral-800 p-6 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#5865F2]" />
        <div>
          <span className="text-[10px] font-mono text-[#5865F2] tracking-widest uppercase block mb-1">STAFF</span>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-100">Staff Activity</h2>
          <p className="text-xs text-neutral-400 mt-1">Who is moderating, and how much, over the last {days} days ({logs.length} actions).</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((n) => (
            <a key={n} href={`/staff/activity?days=${n}`} className={tab(n)}>
              {n}d
            </a>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 text-xs font-mono text-red-300">Could not load activity. Run the latest supabase/full-setup.sql in Supabase.</div>
      )}

      <div className="bg-neutral-900 border border-neutral-800 p-6">
        <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider mb-4">Last 14 days</h3>
        <div className="flex items-end gap-1.5 h-24">
          {last14.map((x) => (
            <div key={x.d} className="flex-1 flex flex-col items-center justify-end gap-1 h-full" title={`${x.d}: ${x.n}`}>
              <div className="w-full bg-[#5865F2]/70" style={{ height: `${(x.n / peak) * 100}%`, minHeight: x.n ? 2 : 0 }} />
              <span className="text-[9px] font-mono text-neutral-500">{x.d.slice(8)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="bg-neutral-900 border border-neutral-800 p-6 xl:col-span-2 overflow-x-auto">
          <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider mb-4">Leaderboard</h3>
          {rows.length === 0 ? (
            <p className="text-xs font-mono text-neutral-500">No moderation activity in this period.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                  <th className="pb-2">#</th>
                  <th className="pb-2">Staff</th>
                  <th className="pb-2 text-right">Warn</th>
                  <th className="pb-2 text-right">Kick</th>
                  <th className="pb-2 text-right">Ban</th>
                  <th className="pb-2 text-right">Unban</th>
                  <th className="pb-2 text-right">Note</th>
                  <th className="pb-2 text-right">Total</th>
                  <th className="pb-2 text-right">Last action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.name} className="border-t border-neutral-800 text-neutral-300">
                    <td className="py-2 font-mono text-neutral-500">{i + 1}</td>
                    <td className="py-2 font-semibold text-neutral-100">{r.name}</td>
                    <td className="py-2 text-right font-mono">{r.WARN}</td>
                    <td className="py-2 text-right font-mono">{r.KICK}</td>
                    <td className="py-2 text-right font-mono">{r.BAN}</td>
                    <td className="py-2 text-right font-mono">{r.UNBAN}</td>
                    <td className="py-2 text-right font-mono">{r.NOTE}</td>
                    <td className="py-2 text-right font-mono font-bold text-neutral-100">{r.total}</td>
                    <td className="py-2 text-right font-mono text-neutral-500">
                      <LocalTime iso={r.last} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-6">
          <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider mb-4">Repeat offenders</h3>
          {repeat.length === 0 ? (
            <p className="text-xs font-mono text-neutral-500">Nobody has 3+ warns / kicks / bans in this period.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {repeat.map(([id, t]) => (
                <div key={id} className="bg-neutral-950 border border-neutral-800 p-3 flex items-center justify-between gap-2">
                  <div className="text-xs text-neutral-300 min-w-0">
                    <p className="font-semibold text-neutral-100 truncate">{t.name}</p>
                    <p className="font-mono text-[10px] text-neutral-500">{id}</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 border border-amber-500/30 text-amber-300">{t.n} actions</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
