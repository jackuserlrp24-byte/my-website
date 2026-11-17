import Link from 'next/link';
import { getOfficer, canManageMet } from '@/lib/met-access';
import { supabaseAdmin } from '@/lib/portal';

export const dynamic = 'force-dynamic';

const when = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

const reason = (t: string | null, target: string | null) =>
  t === 'firearm' ? 'Fired a firearm' : t === 'taser' ? 'Fired a taser' : `Hit ${target || 'a player'}`;

export default async function IncidentsPage() {
  const officer = (await getOfficer())!;
  const manager = canManageMet(officer);

  let q = supabaseAdmin
    .from('bodycam_incidents')
    .select('id, created_at, officer_name, target_name, trigger, serial, coords, total_ms, status')
    .order('created_at', { ascending: false })
    .limit(100);
  if (!manager) q = q.eq('officer_discord_id', officer.id);
  const { data, error } = await q;
  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Incidents</h1>
        <p className="text-sm text-slate-500 mt-1">
          {manager ? 'Incidents logged by every officer.' : 'Incidents logged against you.'} They are recorded automatically when a body-worn camera is triggered, and are
          cleared together with their footage (14 days by default).
        </p>
      </div>

      {error ? (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-4 py-3">Incidents are not set up yet. Run supabase/bodycam.sql in Supabase.</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500 border border-dashed border-slate-300 rounded-md px-4 py-10 text-center">No incidents logged.</p>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">When</th>
                {manager && <th className="px-4 py-3">Officer</th>}
                <th className="px-4 py-3">What happened</th>
                <th className="px-4 py-3">Serial</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Video</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-700">{when(r.created_at)}</td>
                  {manager && <td className="px-4 py-3 text-slate-700">{r.officer_name || 'Unknown'}</td>}
                  <td className="px-4 py-3 font-medium text-slate-900">{reason(r.trigger, r.target_name)}</td>
                  <td className="px-4 py-3 text-slate-600">{r.serial || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{r.coords || '-'}</td>
                  <td className="px-4 py-3">
                    {r.status === 'ready' ? (
                      <Link href={`/met-police/body-worn-video?clip=${r.id}`} className="text-[#00247D] font-semibold hover:underline">
                        Watch
                      </Link>
                    ) : (
                      <span className="text-slate-400">Uploading...</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
