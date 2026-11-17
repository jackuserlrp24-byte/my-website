import Link from 'next/link';
import { getOfficer } from '@/lib/met-access';
import { supabaseAdmin } from '@/lib/portal';
import { ADVANCED_ROLE_ID, IPP_ROLE_ID, hasRoleId } from '@/lib/training-config';
import { ui, when } from '@/lib/met-util';

export const dynamic = 'force-dynamic';

export default async function TrainingPage() {
  const officer = (await getOfficer())!;

  const [records, upcoming] = await Promise.all([
    supabaseAdmin
      .from('met_training_records')
      .select('id, training_name, issuer_name, notes, created_at')
      .eq('target_discord_id', officer.id)
      .order('created_at', { ascending: false })
      .limit(100),
    supabaseAdmin
      .from('trainings')
      .select('id, title, host, starts_at, cancelled_at')
      .contains('attending_ids', [officer.id])
      .gte('starts_at', new Date().toISOString())
      .is('cancelled_at', null)
      .order('starts_at', { ascending: true })
      .limit(10),
  ]);

  // Qualifications come from Discord roles the portal already knows about.
  const quals = [
    hasRoleId(officer.roles, IPP_ROLE_ID) && { name: 'IPP', note: 'Initial Police Practice' },
    hasRoleId(officer.roles, ADVANCED_ROLE_ID) && { name: 'Advanced', note: 'Advanced driver / officer qualification' },
  ].filter(Boolean) as { name: string; note: string }[];

  const rows = records.data ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className={ui.h1}>Training</h1>
        <p className={ui.sub}>Your courses, qualifications and training record.</p>
      </div>

      {records.error && <p className={ui.warn}>Could not read training records. Run supabase/full-setup.sql in Supabase.</p>}

      <section className="space-y-3">
        <h2 className={ui.eyebrow}>Qualifications</h2>
        {quals.length === 0 ? (
          <p className="text-xs text-slate-400">No qualifications on record yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quals.map((q) => (
              <div key={q.name} className={ui.card}>
                <p className="text-base font-bold text-slate-900">{q.name}</p>
                <p className="text-xs text-slate-500">{q.note}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className={ui.eyebrow}>Upcoming courses</h2>
          <Link href="/dashboard/trainings" className="text-xs font-semibold text-[#00247D] hover:underline">Book a training &rarr;</Link>
        </div>
        {(upcoming.data ?? []).length === 0 ? (
          <p className="text-xs text-slate-400">You are not signed up to any upcoming training.</p>
        ) : (
          <ul className="space-y-2">
            {(upcoming.data ?? []).map((t) => (
              <li key={t.id} className="border border-slate-200 rounded-md px-3 py-2 text-sm flex items-center justify-between gap-3">
                <span className="font-medium text-slate-900">{t.title}</span>
                <span className="text-xs text-slate-500">{when(t.starts_at)}{t.host ? ` · ${t.host}` : ''}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className={ui.eyebrow}>Training record ({rows.length})</h2>
        {rows.length === 0 ? (
          <p className={ui.empty}>No training recorded yet.</p>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className={ui.th}>Course</th>
                  <th className={ui.th}>Date</th>
                  <th className={ui.th}>Instructor</th>
                  <th className={ui.th}>Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{r.training_name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">{when(r.created_at)}</td>
                    <td className="px-4 py-3 text-slate-600">{r.issuer_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{r.notes || '-'}</td>
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
