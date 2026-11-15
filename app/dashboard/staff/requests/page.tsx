import { redirect } from 'next/navigation';
import LocalTime from '@/app/components/LocalTime';
import { getPortalUser, supabaseAdmin } from '@/lib/portal';
import AutoRefresh from './AutoRefresh';

export const dynamic = 'force-dynamic';

interface StaffRequest {
  id: string;
  game_id: number | null;
  player_name: string | null;
  discord_id: string | null;
  reason: string;
  status: 'open' | 'accepted' | 'denied';
  handled_by: string | null;
  created_at: string;
  handled_at: string | null;
}

const STALE_MS = 30 * 60 * 1000; // an "open" request older than this has almost certainly been lost (e.g. server restart)

export default async function StaffRequestsPage() {
  const user = await getPortalUser();
  if (!user) redirect('/');
  if (!user.canStaff) redirect('/dashboard');

  const { data, error } = await supabaseAdmin.from('staff_requests').select('*').order('created_at', { ascending: false }).limit(60);
  const all = (data ?? []) as StaffRequest[];
  const now = Date.now();
  const isOpen = (r: StaffRequest) => r.status === 'open' && now - new Date(r.created_at).getTime() < STALE_MS;
  const open = all.filter(isOpen);
  const history = all.filter((r) => !isOpen(r));

  return (
    <main className="flex flex-col w-full gap-6 pb-16 select-none antialiased">
      <AutoRefresh />
      <div className="w-full bg-neutral-900 border border-neutral-800 p-6 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#5865F2]" />
        <div>
          <span className="text-[10px] font-mono text-[#5865F2] tracking-widest uppercase block mb-1">STAFF</span>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-100">Staff Requests</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Players asking for staff with /staffrequest in game. Updates by itself. Accept or deny requests in game with /acceptrequest and /denyrequest.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 text-xs font-mono text-red-300">
          Could not load staff requests. Run the latest supabase/full-setup.sql in Supabase.
        </div>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest">
          Waiting <span className="text-neutral-600">({open.length})</span>
        </h3>
        <div className="bg-neutral-900 border border-neutral-800 divide-y divide-neutral-800">
          {open.length === 0 && <p className="px-5 py-4 text-xs text-neutral-500">No one is waiting for staff right now.</p>}
          {open.map((r) => (
            <div key={r.id} className="px-5 py-4 flex flex-col gap-1 border-l-2 border-amber-500/70">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-sm font-semibold text-neutral-100">{r.player_name ?? 'Unknown'}</span>
                {r.game_id != null && <span className="text-[11px] font-mono text-neutral-500">ID {r.game_id}</span>}
                {r.discord_id && <span className="text-[11px] font-mono text-neutral-500">{r.discord_id}</span>}
                <span className="ml-auto text-[11px] font-mono text-neutral-500">
                  <LocalTime iso={r.created_at} />
                </span>
              </div>
              <p className="text-xs text-neutral-300 break-words">{r.reason}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest">Recent</h3>
        <div className="bg-neutral-900 border border-neutral-800 divide-y divide-neutral-800">
          {history.length === 0 && <p className="px-5 py-4 text-xs text-neutral-500">Nothing yet.</p>}
          {history.map((r) => {
            const label = r.status === 'accepted' ? 'ACCEPTED' : r.status === 'denied' ? 'DENIED' : 'EXPIRED';
            const colour =
              r.status === 'accepted'
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                : r.status === 'denied'
                  ? 'text-red-400 bg-red-500/10 border-red-500/30'
                  : 'text-neutral-400 bg-neutral-800 border-neutral-700';
            return (
              <div key={r.id} className="px-5 py-3 flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-sm font-semibold text-neutral-200">{r.player_name ?? 'Unknown'}</span>
                  {r.game_id != null && <span className="text-[11px] font-mono text-neutral-600">ID {r.game_id}</span>}
                  <span className={`px-2 py-0.5 text-[10px] font-mono font-bold border ${colour}`}>{label}</span>
                  {r.handled_by && <span className="text-[11px] font-mono text-neutral-500">by {r.handled_by}</span>}
                  <span className="ml-auto text-[11px] font-mono text-neutral-600">
                    <LocalTime iso={r.created_at} />
                  </span>
                </div>
                <p className="text-xs text-neutral-400 break-words">{r.reason}</p>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
