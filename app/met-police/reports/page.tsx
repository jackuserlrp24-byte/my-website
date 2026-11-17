import Link from 'next/link';
import { getOfficer, canManageMet } from '@/lib/met-access';
import { supabaseAdmin } from '@/lib/portal';
import { ui, when } from '@/lib/met-util';
import { REPORT_BY_KEY, REPORT_TYPES, type ReportKey } from '@/lib/met-report-types';
import { MET_FORMS } from '@/lib/met-forms';
import { submitReport } from './actions';

export const dynamic = 'force-dynamic';

interface Report {
  id: string;
  created_at: string;
  reference: string;
  type: ReportKey;
  summary: string;
  fields: Record<string, string>;
  incident_ref: string | null;
  author_name: string | null;
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type: picked } = await searchParams;
  const officer = (await getOfficer())!;
  const manager = canManageMet(officer);
  const active = REPORT_BY_KEY[(picked as ReportKey) ?? 'crime'] ?? REPORT_TYPES[0];

  let q = supabaseAdmin.from('met_reports').select('*').order('created_at', { ascending: false }).limit(60);
  if (!manager) q = q.eq('author_id', officer.id);
  const { data, error } = await q;
  const reports = (data ?? []) as Report[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className={ui.h1}>Reports</h1>
        <p className={ui.sub}>Crime reports, use of force and stop and search. Every report gets a reference number.</p>
      </div>

      {error && <p className={ui.warn}>Reports are not set up yet. Run supabase/met-portal.sql in Supabase.</p>}

      {/* Pick a report type */}
      <div className="flex flex-wrap gap-2">
        {REPORT_TYPES.map((t) => (
          <Link
            key={t.key}
            href={`/met-police/reports?type=${t.key}`}
            className={`px-4 py-2 text-sm font-semibold rounded-md border ${
              t.key === active.key ? 'bg-[#00247D] text-white border-[#00247D]' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {t.title}
          </Link>
        ))}
      </div>

      <form action={submitReport} className={ui.panel}>
        <input type="hidden" name="type" value={active.key} />
        <div>
          <p className="text-base font-bold text-slate-900">{active.title}</p>
          <p className="text-xs text-slate-500">{active.blurb}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {active.fields.map((f) => {
            const wide = f.kind === 'textarea';
            return (
              <div key={f.name} className={wide ? 'sm:col-span-2' : ''}>
                <label className={ui.label}>
                  {f.label}
                  {f.required && <span className="text-red-600"> *</span>}
                </label>
                {f.kind === 'textarea' ? (
                  <textarea name={f.name} required={f.required} rows={4} maxLength={f.max} className={`${ui.input} resize-y`} />
                ) : f.kind === 'select' ? (
                  <select name={f.name} required={f.required} defaultValue="" className={ui.input}>
                    <option value="" disabled>Choose...</option>
                    {f.options?.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <input name={f.name} required={f.required} type={f.kind === 'datetime' ? 'datetime-local' : 'text'} maxLength={f.max} className={ui.input} />
                )}
              </div>
            );
          })}
          <div>
            <label className={ui.label}>Incident reference (optional)</label>
            <input name="incident_ref" maxLength={20} placeholder="INC-123456" className={ui.input} />
          </div>
        </div>
        <button type="submit" className={ui.btn}>Submit report</button>
      </form>

      {/* Submitted reports */}
      <section className="space-y-3">
        <h2 className={ui.eyebrow}>{manager ? 'All reports' : 'My reports'}</h2>
        {reports.length === 0 ? (
          <p className={ui.empty}>No reports submitted yet.</p>
        ) : (
          reports.map((r) => (
            <details key={r.id} className={ui.card}>
              <summary className="cursor-pointer flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="text-xs font-mono text-slate-500">{r.reference}</span>{' '}
                  <span className="text-sm font-semibold text-slate-900">{r.summary}</span>
                </span>
                <span className="text-xs text-slate-500">
                  {REPORT_BY_KEY[r.type]?.title} · {when(r.created_at)}
                  {manager && r.author_name ? ` · ${r.author_name}` : ''}
                </span>
              </summary>
              <dl className="mt-3 space-y-2 text-sm">
                {r.incident_ref && (
                  <div>
                    <dt className="text-xs font-semibold text-slate-500">Incident</dt>
                    <dd className="text-slate-800">{r.incident_ref}</dd>
                  </div>
                )}
                {Object.entries(r.fields ?? {}).map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-semibold text-slate-500">{label}</dt>
                    <dd className="text-slate-800 whitespace-pre-wrap">{value}</dd>
                  </div>
                ))}
              </dl>
            </details>
          ))
        )}
      </section>

      {MET_FORMS.length > 0 && (
        <p className="text-sm text-slate-500">
          Looking for another form? <Link href="/met-police/forms" className="text-[#00247D] font-semibold hover:underline">Forms &amp; Paperwork</Link>
        </p>
      )}
    </div>
  );
}
