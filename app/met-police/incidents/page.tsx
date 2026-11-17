import Link from 'next/link';
import { getOfficer, canManageMet } from '@/lib/met-access';
import { getOfficerOptions } from '@/lib/met-officers';
import { supabaseAdmin } from '@/lib/portal';
import { ui, when } from '@/lib/met-util';
import { addIncidentUpdate, createIncident, setIncidentStatus } from './actions';

export const dynamic = 'force-dynamic';

const reason = (t: string | null, target: string | null) =>
  t === 'firearm' ? 'Fired a firearm' : t === 'taser' ? 'Fired a taser' : `Hit ${target || 'a player'}`;

const PRIORITY: Record<string, string> = {
  high: 'text-red-700 border-red-200 bg-red-50',
  normal: 'text-slate-600 border-slate-200 bg-slate-50',
  low: 'text-slate-500 border-slate-200 bg-white',
};

interface Incident {
  id: string;
  created_at: string;
  reference: string;
  title: string;
  location: string | null;
  details: string | null;
  priority: string;
  status: 'open' | 'closed';
  assigned_to_id: string | null;
  assigned_to_name: string | null;
}
interface Update {
  id: string;
  created_at: string;
  incident_id: string;
  author_name: string | null;
  body: string;
}

export default async function IncidentsPage() {
  const officer = (await getOfficer())!;
  const manager = canManageMet(officer);

  let iq = supabaseAdmin.from('met_incidents').select('*').order('status', { ascending: false }).order('created_at', { ascending: false }).limit(100);
  if (!manager) iq = iq.eq('assigned_to_id', officer.id);

  let bq = supabaseAdmin
    .from('bodycam_incidents')
    .select('id, created_at, officer_name, target_name, trigger, serial, coords, total_ms, status')
    .order('created_at', { ascending: false })
    .limit(100);
  if (!manager) bq = bq.eq('officer_discord_id', officer.id);

  const [incRes, bodyRes, options] = await Promise.all([iq, bq, manager ? getOfficerOptions() : Promise.resolve([])]);
  const incidents = (incRes.data ?? []) as Incident[];
  const bodycam = bodyRes.data ?? [];

  let updates: Update[] = [];
  if (incidents.length) {
    const { data } = await supabaseAdmin
      .from('met_incident_updates')
      .select('id, created_at, incident_id, author_name, body')
      .in('incident_id', incidents.map((i) => i.id))
      .order('created_at', { ascending: true });
    updates = (data ?? []) as Update[];
  }
  const updatesFor = (id: string) => updates.filter((u) => u.incident_id === id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className={ui.h1}>My Incidents</h1>
        <p className={ui.sub}>
          {manager ? 'Every incident, and who it is assigned to.' : 'Incidents assigned to you.'} Each one has a reference you can quote in reports, statements and evidence.
        </p>
      </div>

      {/* New incident */}
      <details className={ui.panel}>
        <summary className="cursor-pointer text-sm font-semibold text-[#00247D]">+ Log a new incident</summary>
        <form action={createIncident} className="mt-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className={ui.label}>Title</label>
              <input name="title" required maxLength={120} placeholder="e.g. Armed robbery, Vinewood Blvd" className={ui.input} />
            </div>
            <div>
              <label className={ui.label}>Location</label>
              <input name="location" maxLength={160} className={ui.input} />
            </div>
            <div>
              <label className={ui.label}>Priority</label>
              <select name="priority" defaultValue="normal" className={ui.input}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>
            {manager && (
              <div className="sm:col-span-2">
                <label className={ui.label}>Assign to</label>
                <select name="assignee" defaultValue={officer.id} className={ui.input}>
                  <option value={officer.id}>Me</option>
                  {options.filter((o) => o.discord_id !== officer.id).map((o) => (
                    <option key={o.discord_id} value={o.discord_id}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className={ui.label}>Details</label>
              <textarea name="details" rows={4} maxLength={3000} className={`${ui.input} resize-y`} />
            </div>
          </div>
          <button type="submit" className={ui.btn}>Create incident</button>
        </form>
      </details>

      {/* Assigned incidents */}
      <section className="space-y-3">
        <h2 className={ui.eyebrow}>{manager ? 'All incidents' : 'Assigned to me'}</h2>
        {incRes.error ? (
          <p className={ui.warn}>Incidents are not set up yet. Run supabase/met-portal.sql in Supabase.</p>
        ) : incidents.length === 0 ? (
          <p className={ui.empty}>No incidents.</p>
        ) : (
          incidents.map((i) => (
            <article key={i.id} className={`${ui.card} ${i.status === 'closed' ? 'opacity-70' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-mono text-slate-500">{i.reference}</p>
                  <h3 className="text-base font-bold text-slate-900">{i.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {when(i.created_at)}
                    {i.location ? ` · ${i.location}` : ''}
                    {manager && i.assigned_to_name ? ` · ${i.assigned_to_name}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`${ui.pill} ${PRIORITY[i.priority] ?? PRIORITY.normal}`}>{i.priority}</span>
                  <span className={`${ui.pill} ${i.status === 'open' ? 'text-emerald-700 border-emerald-200 bg-emerald-50' : 'text-slate-500 border-slate-200'}`}>{i.status}</span>
                </div>
              </div>
              {i.details && <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap">{i.details}</p>}

              <div className="mt-4 border-t border-slate-100 pt-3 space-y-2">
                <p className={ui.eyebrow}>Updates</p>
                {updatesFor(i.id).length === 0 ? (
                  <p className="text-xs text-slate-400">No updates yet.</p>
                ) : (
                  updatesFor(i.id).map((u) => (
                    <p key={u.id} className="text-sm text-slate-700">
                      <span className="text-xs text-slate-400">{when(u.created_at)} · {u.author_name || 'Officer'}: </span>
                      {u.body}
                    </p>
                  ))
                )}
                <form action={addIncidentUpdate} className="flex gap-2 pt-1">
                  <input type="hidden" name="id" value={i.id} />
                  <input name="body" required maxLength={2000} placeholder="Add an update..." className={ui.input} />
                  <button type="submit" className={ui.btn}>Add</button>
                </form>
                <form action={setIncidentStatus}>
                  <input type="hidden" name="id" value={i.id} />
                  <input type="hidden" name="status" value={i.status === 'open' ? 'closed' : 'open'} />
                  <button type="submit" className={ui.btnGhost}>{i.status === 'open' ? 'Close incident' : 'Reopen incident'}</button>
                </form>
              </div>
            </article>
          ))
        )}
      </section>

      {/* Body-cam incidents (unchanged behaviour) */}
      <section className="space-y-3">
        <h2 className={ui.eyebrow}>Body-worn camera triggers</h2>
        <p className="text-xs text-slate-500">
          Logged automatically when a camera is triggered, and cleared together with their footage (14 days by default).
        </p>
        {bodyRes.error ? (
          <p className={ui.warn}>Camera incidents are not set up yet. Run supabase/bodycam.sql in Supabase.</p>
        ) : bodycam.length === 0 ? (
          <p className={ui.empty}>No camera incidents logged.</p>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className={ui.th}>When</th>
                  {manager && <th className={ui.th}>Officer</th>}
                  <th className={ui.th}>What happened</th>
                  <th className={ui.th}>Serial</th>
                  <th className={ui.th}>Location</th>
                  <th className={ui.th}>Video</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bodycam.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">{when(r.created_at)}</td>
                    {manager && <td className="px-4 py-3 text-slate-700">{r.officer_name || 'Unknown'}</td>}
                    <td className="px-4 py-3 font-medium text-slate-900">{reason(r.trigger, r.target_name)}</td>
                    <td className="px-4 py-3 text-slate-600">{r.serial || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{r.coords || '-'}</td>
                    <td className="px-4 py-3">
                      {r.status === 'ready' ? (
                        <Link href={`/met-police/body-worn-video?clip=${r.id}`} className="text-[#00247D] font-semibold hover:underline">Watch</Link>
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
      </section>
    </div>
  );
}
