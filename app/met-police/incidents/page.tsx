import Link from 'next/link';
import { supabaseAdmin } from '@/lib/portal';
import { gradeLabel, refToSlug, type MdtIncident } from '@/lib/mdt';
import { ui } from '@/lib/met-util';
import AutoRefresh from '../AutoRefresh';

export const dynamic = 'force-dynamic';

// Same list as INCIDENTS in the MDT: CAD ref, grade, location, status, received, last updated. Newest first.
export default async function IncidentsPage() {
  const { data, error } = await supabaseAdmin.from('mdt_incidents').select('*').order('created_at', { ascending: false }).limit(200);
  const rows = (data ?? []) as MdtIncident[];
  const active = rows.filter((r) => r.status !== 'Closed').length;

  return (
    <div className="space-y-6">
      <AutoRefresh seconds={15} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={ui.h1}>Incidents</h1>
          <p className={ui.sub}>Live from the MDT. Select an incident to open the full incident and its remarks.</p>
        </div>
        <span className={`${ui.pill} ${active ? 'text-white bg-[#00247D] border-[#00247D]' : 'text-slate-500 border-slate-200 bg-slate-50'}`}>{active} active</span>
      </div>

      {error && <p className={ui.warn}>Incidents are not set up yet. Run supabase/met-portal.sql in Supabase, then check the MDT link (MDT_API_KEY).</p>}

      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className={ui.th}>CAD Ref</th>
              <th className={ui.th}>Grade</th>
              <th className={ui.th}>Location</th>
              <th className={ui.th}>Status</th>
              <th className={ui.th}>Received</th>
              <th className={ui.th}>Last Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">No incidents recorded.</td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.cad_ref} className="hover:bg-blue-50/50">
                <td className="px-4 py-2 font-mono">
                  <Link href={`/met-police/incidents/${refToSlug(r.cad_ref)}`} className="text-[#00247D] font-semibold hover:underline">{r.cad_ref}</Link>
                </td>
                <td className="px-4 py-2 text-slate-700">{gradeLabel(r.response_grade, r.call_type)}</td>
                <td className="px-4 py-2 text-slate-700">{r.location || 'UNKNOWN'}</td>
                <td className="px-4 py-2">
                  <span className={`${ui.pill} ${r.status === 'Closed' ? 'text-slate-500 border-slate-200 bg-slate-50' : 'text-amber-700 border-amber-200 bg-amber-50'}`}>{r.status || 'New'}</span>
                </td>
                <td className="px-4 py-2 text-slate-600">{r.received || '-'}</td>
                <td className="px-4 py-2 text-slate-600">{r.last_updated || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
