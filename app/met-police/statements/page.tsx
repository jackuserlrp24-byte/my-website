import { getOfficer, canManageMet } from '@/lib/met-access';
import { supabaseAdmin } from '@/lib/portal';
import { ui, when } from '@/lib/met-util';
import { deleteDraft, saveStatement } from './actions';

export const dynamic = 'force-dynamic';

// Standard MG11 wording (Criminal Justice Act 1967, s.9). It is printed on every statement.
const DECLARATION =
  'This statement is true to the best of my knowledge and belief and I make it knowing that, if it is tendered in evidence, I shall be liable to prosecution if I have wilfully stated in it anything which I know to be false, or do not believe to be true.';

interface Statement {
  id: string;
  created_at: string;
  reference: string;
  status: 'draft' | 'submitted';
  witness_name: string;
  witness_dob: string | null;
  witness_occupation: string | null;
  witness_address: string | null;
  incident_ref: string | null;
  body: string;
  author_id: string;
  author_name: string | null;
  submitted_at: string | null;
}

function Fields({ s }: { s?: Statement }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {s && <input type="hidden" name="id" value={s.id} />}
      <div>
        <label className={ui.label}>Witness name <span className="text-red-600">*</span></label>
        <input name="witness_name" required maxLength={120} defaultValue={s?.witness_name} className={ui.input} />
      </div>
      <div>
        <label className={ui.label}>Date of birth</label>
        <input name="witness_dob" maxLength={30} placeholder="Over 18, or the age" defaultValue={s?.witness_dob ?? ''} className={ui.input} />
      </div>
      <div>
        <label className={ui.label}>Occupation</label>
        <input name="witness_occupation" maxLength={100} defaultValue={s?.witness_occupation ?? ''} className={ui.input} />
      </div>
      <div>
        <label className={ui.label}>Incident reference (optional)</label>
        <input name="incident_ref" maxLength={20} placeholder="INC-123456" defaultValue={s?.incident_ref ?? ''} className={ui.input} />
      </div>
      <div className="sm:col-span-2">
        <label className={ui.label}>Address</label>
        <input name="witness_address" maxLength={200} defaultValue={s?.witness_address ?? ''} className={ui.input} />
      </div>
      <div className="sm:col-span-2">
        <label className={ui.label}>Statement <span className="text-red-600">*</span></label>
        <textarea name="body" required rows={10} maxLength={8000} defaultValue={s?.body} placeholder="Write what the witness saw and heard, in their own words, in order..." className={`${ui.input} resize-y`} />
      </div>
    </div>
  );
}

export default async function StatementsPage() {
  const officer = (await getOfficer())!;
  const manager = canManageMet(officer);

  let q = supabaseAdmin.from('met_statements').select('*').order('created_at', { ascending: false }).limit(60);
  if (!manager) q = q.eq('author_id', officer.id);
  const { data, error } = await q;
  const rows = (data ?? []) as Statement[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className={ui.h1}>Statements</h1>
        <p className={ui.sub}>Create and submit MG11 witness statements. Save a draft and come back to it, or submit it when it is finished.</p>
      </div>

      {error && <p className={ui.warn}>Statements are not set up yet. Run supabase/met-portal.sql in Supabase.</p>}

      <form action={saveStatement} className={ui.panel}>
        <p className="text-base font-bold text-slate-900">New MG11 statement</p>
        <Fields />
        <p className="text-xs text-slate-500 italic">{DECLARATION}</p>
        <div className="flex gap-2">
          <button type="submit" name="intent" value="submit" className={ui.btn}>Submit statement</button>
          <button type="submit" name="intent" value="draft" className={ui.btnGhost}>Save as draft</button>
        </div>
      </form>

      <section className="space-y-3">
        <h2 className={ui.eyebrow}>{manager ? 'All statements' : 'My statements'}</h2>
        {rows.length === 0 ? (
          <p className={ui.empty}>No statements yet.</p>
        ) : (
          rows.map((s) => {
            const editable = s.status === 'draft' && s.author_id === officer.id;
            return (
              <details key={s.id} className={ui.card}>
                <summary className="cursor-pointer flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <span className="text-xs font-mono text-slate-500">{s.reference}</span>{' '}
                    <span className="text-sm font-semibold text-slate-900">{s.witness_name}</span>
                  </span>
                  <span className="flex items-center gap-2 text-xs text-slate-500">
                    {when(s.created_at)}
                    {manager && s.author_name ? ` · ${s.author_name}` : ''}
                    <span className={`${ui.pill} ${s.status === 'submitted' ? 'text-emerald-700 border-emerald-200 bg-emerald-50' : 'text-amber-700 border-amber-200 bg-amber-50'}`}>{s.status}</span>
                  </span>
                </summary>

                {editable ? (
                  <form action={saveStatement} className="mt-4 space-y-3">
                    <Fields s={s} />
                    <p className="text-xs text-slate-500 italic">{DECLARATION}</p>
                    <div className="flex gap-2">
                      <button type="submit" name="intent" value="submit" className={ui.btn}>Submit statement</button>
                      <button type="submit" name="intent" value="draft" className={ui.btnGhost}>Save draft</button>
                    </div>
                  </form>
                ) : (
                  <div className="mt-4 space-y-2 text-sm text-slate-800">
                    <p className="text-xs text-slate-500">
                      {[s.witness_dob && `DOB ${s.witness_dob}`, s.witness_occupation, s.witness_address, s.incident_ref].filter(Boolean).join(' · ')}
                    </p>
                    <p className="whitespace-pre-wrap">{s.body}</p>
                    <p className="text-xs text-slate-500 italic">{DECLARATION}</p>
                    {s.submitted_at && <p className="text-xs text-slate-400">Submitted {when(s.submitted_at)}</p>}
                  </div>
                )}

                {editable && (
                  <form action={deleteDraft} className="mt-2">
                    <input type="hidden" name="id" value={s.id} />
                    <button type="submit" className={ui.danger}>Delete draft</button>
                  </form>
                )}
              </details>
            );
          })
        )}
      </section>
    </div>
  );
}
