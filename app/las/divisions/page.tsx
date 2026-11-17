import { supabaseAdmin } from '@/lib/portal';
import { COMMAND_DEPARTMENTS } from '@/lib/departments';
import { closeExpiredDivisions } from '@/lib/division-deadlines';
import type { Division } from '@/lib/portal-types';
import { ui } from '@/lib/met-util';

export const dynamic = 'force-dynamic';

export default async function LasDivisionsPage() {
  await closeExpiredDivisions();
  const { data, error } = await supabaseAdmin
    .from('divisions')
    .select('*')
    .in('department', COMMAND_DEPARTMENTS.las.divisionDepartments)
    .order('department')
    .order('sort_order');
  const rows = (data ?? []) as Division[];
  const groups = Array.from(new Set(rows.map((d) => d.department)));
  const label = (d: string) => (d === 'CONTROL' ? 'Control' : 'London Ambulance Service');

  return (
    <div className="space-y-8">
      <div>
        <h1 className={ui.h1}>Divisions</h1>
        <p className={ui.sub}>LAS and Control divisions. Open divisions link straight to their application form.</p>
      </div>

      {error && <p className={ui.warn}>Could not load divisions. Run the latest supabase/full-setup.sql in Supabase.</p>}
      {!error && rows.length === 0 && <p className={ui.empty}>No divisions have been set up yet.</p>}

      {groups.map((g) => (
        <section key={g} className="space-y-3">
          <h2 className={ui.eyebrow}>{label(g)}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rows.filter((d) => d.department === g).map((d) => {
              const isOpen = d.status === 'open';
              const body = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-slate-900">{d.name}</p>
                    <span className={`${ui.pill} ${isOpen ? 'text-emerald-700 border-emerald-200 bg-emerald-50' : 'text-slate-500 border-slate-200 bg-slate-50'}`}>
                      {isOpen ? 'Open' : 'Closed'}
                    </span>
                  </div>
                  {d.description && <p className="text-sm text-slate-500 mt-1">{d.description}</p>}
                  {isOpen && d.closes_on && <p className="text-xs text-slate-400 mt-2">Closes {d.closes_on}</p>}
                </>
              );
              return isOpen && d.application_url ? (
                <a key={d.id} href={d.application_url} target="_blank" rel="noopener noreferrer" className="block border border-slate-200 rounded-lg p-4 hover:border-emerald-700 hover:bg-emerald-50/50 transition-colors">
                  {body}
                </a>
              ) : (
                <div key={d.id} className={`${ui.card} ${isOpen ? '' : 'opacity-70'}`}>{body}</div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
