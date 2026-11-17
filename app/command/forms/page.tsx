import Link from 'next/link';
import { redirect } from 'next/navigation';
import { canManageMet, getOfficer } from '@/lib/met-access';
import { EFORM_STATUS } from '@/lib/mdt';
import { getEformDefs } from '@/lib/mdt-eforms';
import { supabaseAdmin } from '@/lib/portal';
import { ui } from '@/lib/met-util';
import AutoRefresh from '@/app/met-police/AutoRefresh';

export const dynamic = 'force-dynamic';

interface Row { ref: string; type: string; title: string; form_date: string | null; form_time: string | null; officer_name: string | null; callsign: string | null; status: string; photos: number }

// Every e-form that has been submitted, from the MDT and from the website.
export default async function SubmittedFormsPage({ searchParams }: { searchParams: Promise<{ type?: string; status?: string }> }) {
  const officer = (await getOfficer())!;
  if (!canManageMet(officer)) redirect('/command');

  const sp = await searchParams;
  const { defs, order } = await getEformDefs();

  let q = supabaseAdmin.from('mdt_eforms').select('ref, type, title, form_date, form_time, officer_name, callsign, status, photos').order('created_at', { ascending: false }).limit(200);
  if (sp.type && defs[sp.type]) q = q.eq('type', sp.type);
  if (sp.status && EFORM_STATUS[sp.status]) q = q.eq('status', sp.status);
  const { data, error } = await q;
  const rows = (data ?? []) as Row[];

  return (
    <div className="space-y-6">
      <AutoRefresh seconds={30} />
      <div>
        <h1 className={ui.h1}>Submitted Forms</h1>
        <p className={ui.sub}>Every e-form filed in the MDT or on the website.</p>
      </div>

      <form method="get" className="flex flex-wrap items-center gap-2">
        <select name="type" defaultValue={sp.type ?? ''} className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
          <option value="">All forms</option>
          {order.filter((k) => defs[k]).map((k) => <option key={k} value={k}>{defs[k].title}</option>)}
        </select>
        <select name="status" defaultValue={sp.status ?? ''} className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
          <option value="">Any status</option>
          {Object.entries(EFORM_STATUS).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
        </select>
        <button type="submit" className={ui.btn}>Filter</button>
      </form>

      {error && <p className={ui.warn}>E-Forms are not set up yet. Run supabase/met-portal.sql in Supabase.</p>}

      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr><th className={ui.th}>Ref</th><th className={ui.th}>Form</th><th className={ui.th}>Officer</th><th className={ui.th}>Submitted</th><th className={ui.th}>Status</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No forms found.</td></tr>}
            {rows.map((f) => {
              const [label, colour] = EFORM_STATUS[f.status] ?? EFORM_STATUS.waiting;
              return (
                <tr key={f.ref} className="hover:bg-blue-50/50">
                  <td className="px-4 py-2 font-mono"><Link href={`/met-police/eforms/view/${f.ref}`} className="text-[#00247D] font-semibold hover:underline">{f.ref}</Link></td>
                  <td className="px-4 py-2">{f.title}{f.photos ? ` (${f.photos} photo${f.photos > 1 ? 's' : ''})` : ''}</td>
                  <td className="px-4 py-2 text-slate-600">{[f.callsign, f.officer_name].filter(Boolean).join(' - ') || '-'}</td>
                  <td className="px-4 py-2 text-slate-600">{f.form_date} {f.form_time}</td>
                  <td className={`px-4 py-2 text-xs font-bold ${colour}`}>{label}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
