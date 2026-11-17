import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MO19_COMMAND_ROLE_ID, canViewFirearms, getOfficer } from '@/lib/met-access';
import { PIP_STEPS, STATUS_LABEL, STATUS_STYLE } from '@/lib/met-pip';
import { supabaseAdmin } from '@/lib/portal';
import { day, ui, when } from '@/lib/met-util';
import { deletePip, logPip, updatePip } from './actions';

export const dynamic = 'force-dynamic';

interface Pip {
  id: string;
  created_at: string;
  reference: string;
  incident_date: string;
  incident_ref: string | null;
  location: string;
  officers: string;
  discharged: boolean;
  rounds_fired: number;
  injuries: string | null;
  summary: string;
  status: string;
  checklist: Record<string, boolean> | null;
  review_notes: string | null;
  created_by_name: string | null;
}

export default async function FirearmsPipPage() {
  const officer = (await getOfficer())!;
  if (!canViewFirearms(officer)) redirect('/met-police/command');

  const list = await supabaseAdmin.from('met_firearms_pip').select('*').order('incident_date', { ascending: false }).order('created_at', { ascending: false }).limit(200);
  const rows = (list.data ?? []) as Pip[];

  return (
    <div className="space-y-8">
      <div>
        <Link href="/met-police/command" className="text-xs font-semibold text-[#00247D] hover:underline">&larr; Command</Link>
        <h1 className={`${ui.h1} mt-2`}>Firearms PIP</h1>
        <p className={ui.sub}>Post incident procedure records. Visible to MO19 Command only.</p>
      </div>

      {!MO19_COMMAND_ROLE_ID && (
        <p className={ui.warn}>DISCORD_MO19_COMMAND_ROLE_ID is not set, so only management can open this page. Set it in Vercel to your MO19 Command role ID.</p>
      )}
      {list.error && <p className={ui.warn}>Firearms PIP is not set up yet. Run supabase/met-portal.sql in Supabase.</p>}

      <form action={logPip} className={ui.panel}>
        <p className={ui.eyebrow}>Open a PIP record</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={ui.label}>Date</label>
            <input type="date" name="date" required className={ui.input} />
          </div>
          <div>
            <label className={ui.label}>Incident reference (optional)</label>
            <input name="incident_ref" maxLength={40} placeholder="INC-123456" className={ui.input} />
          </div>
          <div>
            <label className={ui.label}>Location</label>
            <input name="location" required maxLength={160} className={ui.input} />
          </div>
          <div className="sm:col-span-3">
            <label className={ui.label}>Officers involved</label>
            <input name="officers" required maxLength={300} placeholder="Names / collar numbers" className={ui.input} />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" name="discharged" /> Weapon discharged</label>
          </div>
          <div>
            <label className={ui.label}>Rounds fired</label>
            <input name="rounds" type="number" min={0} max={999} defaultValue={0} className={ui.input} />
          </div>
          <div>
            <label className={ui.label}>Injuries (optional)</label>
            <input name="injuries" maxLength={300} className={ui.input} />
          </div>
        </div>
        <textarea name="summary" required rows={4} maxLength={3000} placeholder="Summary of the incident" className={`${ui.input} resize-y`} />
        <button type="submit" className={ui.btn}>Open record</button>
      </form>

      <section className="space-y-3">
        <h2 className={ui.eyebrow}>Records ({rows.length})</h2>
        {rows.length === 0 ? (
          <p className={ui.empty}>No PIP records.</p>
        ) : (
          rows.map((p) => {
            const done = PIP_STEPS.filter((s) => p.checklist?.[s.key]).length;
            return (
              <article key={p.id} className={ui.card}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono text-slate-500">{p.reference}</span>
                      <span className={`${ui.pill} ${STATUS_STYLE[p.status] ?? STATUS_STYLE.open}`}>{STATUS_LABEL[p.status] ?? p.status}</span>
                      {p.discharged && <span className={`${ui.pill} text-red-700 border-red-200 bg-red-50`}>Discharge &middot; {p.rounds_fired} rd</span>}
                      <span className="text-xs text-slate-400">{done}/{PIP_STEPS.length} steps</span>
                    </div>
                    <p className="text-base font-bold text-slate-900 mt-1">{p.location}</p>
                    <p className="text-xs text-slate-500">
                      {day(p.incident_date)}{p.incident_ref ? ` · ${p.incident_ref}` : ''} &middot; {p.officers} &middot; opened by {p.created_by_name || 'command'} {when(p.created_at)}
                    </p>
                  </div>
                  <form action={deletePip}>
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" className={ui.danger}>Delete</button>
                  </form>
                </div>
                <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap">{p.summary}</p>
                {p.injuries && <p className="text-xs text-slate-500 mt-1">Injuries: {p.injuries}</p>}

                <form action={updatePip} className="mt-4 space-y-3 border-t border-slate-100 pt-3">
                  <input type="hidden" name="id" value={p.id} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {PIP_STEPS.map((s) => (
                      <label key={s.key} className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" name={s.key} defaultChecked={!!p.checklist?.[s.key]} /> {s.label}
                      </label>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 items-end">
                    <div>
                      <label className={ui.label}>Status</label>
                      <select name="status" defaultValue={p.status} className={ui.input}>
                        <option value="open">Open</option>
                        <option value="under_review">Under review</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                    <div className="flex-1 min-w-[14rem]">
                      <label className={ui.label}>Review note</label>
                      <input name="review_notes" maxLength={1500} defaultValue={p.review_notes ?? ''} className={ui.input} />
                    </div>
                    <button type="submit" className={ui.btnGhost}>Save</button>
                  </div>
                </form>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
