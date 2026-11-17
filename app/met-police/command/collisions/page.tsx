import Link from 'next/link';
import { redirect } from 'next/navigation';
import { canViewCollisions, getOfficer } from '@/lib/met-access';
import { getOfficerOptions } from '@/lib/met-officers';
import { COLLISION_SEVERITY, STATUS_LABEL, STATUS_STYLE } from '@/lib/met-pip';
import { supabaseAdmin } from '@/lib/portal';
import { day, ui, when } from '@/lib/met-util';
import { deleteCollision, logCollision, updateCollision } from './actions';

export const dynamic = 'force-dynamic';

interface Collision {
  id: string;
  created_at: string;
  reference: string;
  collision_date: string;
  officer_name: string | null;
  vehicle: string | null;
  location: string;
  severity: string;
  injuries: boolean;
  response_driving: boolean;
  description: string;
  status: string;
  review_notes: string | null;
  created_by_name: string | null;
}

export default async function CollisionsPage() {
  const officer = (await getOfficer())!;
  if (!canViewCollisions(officer)) redirect('/met-police/command');

  const [list, options] = await Promise.all([
    supabaseAdmin.from('met_collisions').select('*').order('collision_date', { ascending: false }).order('created_at', { ascending: false }).limit(200),
    getOfficerOptions(),
  ]);
  const rows = (list.data ?? []) as Collision[];

  return (
    <div className="space-y-8">
      <div>
        <Link href="/met-police/command" className="text-xs font-semibold text-[#00247D] hover:underline">&larr; Command</Link>
        <h1 className={`${ui.h1} mt-2`}>Police Collisions</h1>
        <p className={ui.sub}>Visible to Driving Standards and Gold Command only.</p>
      </div>

      {list.error && <p className={ui.warn}>Collisions are not set up yet. Run supabase/met-portal.sql in Supabase.</p>}

      <form action={logCollision} className={ui.panel}>
        <p className={ui.eyebrow}>Log a collision</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={ui.label}>Date</label>
            <input type="date" name="date" required className={ui.input} />
          </div>
          <div className="sm:col-span-2">
            <label className={ui.label}>Officer driving</label>
            <select name="officer" required defaultValue="" className={ui.input}>
              <option value="" disabled>Choose an officer...</option>
              {options.map((o) => <option key={o.discord_id} value={o.discord_id}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={ui.label}>Vehicle / callsign</label>
            <input name="vehicle" maxLength={60} placeholder="e.g. LX19 ABC, Alpha 12" className={ui.input} />
          </div>
          <div className="sm:col-span-2">
            <label className={ui.label}>Location</label>
            <input name="location" required maxLength={160} className={ui.input} />
          </div>
          <div>
            <label className={ui.label}>Severity</label>
            <select name="severity" defaultValue="minor" className={ui.input}>
              {COLLISION_SEVERITY.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2 flex items-end gap-6 pb-2">
            <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" name="injuries" /> Injuries</label>
            <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" name="response_driving" /> Response driving</label>
          </div>
        </div>
        <textarea name="description" required rows={4} maxLength={3000} placeholder="What happened?" className={`${ui.input} resize-y`} />
        <button type="submit" className={ui.btn}>Log collision</button>
      </form>

      <section className="space-y-3">
        <h2 className={ui.eyebrow}>Collisions ({rows.length})</h2>
        {rows.length === 0 ? (
          <p className={ui.empty}>No collisions logged.</p>
        ) : (
          rows.map((c) => (
            <article key={c.id} className={ui.card}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono text-slate-500">{c.reference}</span>
                    <span className={`${ui.pill} ${STATUS_STYLE[c.status] ?? STATUS_STYLE.open}`}>{STATUS_LABEL[c.status] ?? c.status}</span>
                    <span className={`${ui.pill} text-slate-600 border-slate-200`}>{c.severity}</span>
                    {c.injuries && <span className={`${ui.pill} text-red-700 border-red-200 bg-red-50`}>Injuries</span>}
                    {c.response_driving && <span className={`${ui.pill} text-blue-700 border-blue-200 bg-blue-50`}>Response</span>}
                  </div>
                  <p className="text-base font-bold text-slate-900 mt-1">{c.location}</p>
                  <p className="text-xs text-slate-500">
                    {day(c.collision_date)} &middot; {c.officer_name || 'Officer'}{c.vehicle ? ` · ${c.vehicle}` : ''} &middot; logged by {c.created_by_name || 'command'} {when(c.created_at)}
                  </p>
                </div>
                <form action={deleteCollision}>
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" className={ui.danger}>Delete</button>
                </form>
              </div>
              <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap">{c.description}</p>
              <form action={updateCollision} className="mt-4 flex flex-wrap gap-2 items-end border-t border-slate-100 pt-3">
                <input type="hidden" name="id" value={c.id} />
                <div>
                  <label className={ui.label}>Status</label>
                  <select name="status" defaultValue={c.status} className={ui.input}>
                    <option value="open">Open</option>
                    <option value="under_review">Under review</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[14rem]">
                  <label className={ui.label}>Review note</label>
                  <input name="review_notes" maxLength={1500} defaultValue={c.review_notes ?? ''} className={ui.input} />
                </div>
                <button type="submit" className={ui.btnGhost}>Save</button>
              </form>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
