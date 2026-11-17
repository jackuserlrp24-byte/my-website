import Link from 'next/link';
import { canManageMet, getOfficer } from '@/lib/met-access';
import { EFORM_STATUS } from '@/lib/mdt';
import { getEformDefs } from '@/lib/mdt-eforms';
import { supabaseAdmin } from '@/lib/portal';
import { ui } from '@/lib/met-util';

export const dynamic = 'force-dynamic';

interface Row { ref: string; type: string; title: string; form_date: string | null; form_time: string | null; officer_name: string | null; status: string; photos: number }

// E-Forms, copied from the MDT: pick a form to fill in, and see the forms that have been submitted.
export default async function EformsPage() {
  const officer = (await getOfficer())!;
  const manager = canManageMet(officer);
  const { defs, order } = await getEformDefs();

  // Command sees every form. Everyone else sees the forms they filed.
  let q = supabaseAdmin.from('mdt_eforms').select('ref, type, title, form_date, form_time, officer_name, status, photos').order('created_at', { ascending: false }).limit(100);
  if (!manager) q = q.eq('author_id', officer.id);
  const { data, error } = await q;
  const rows = (data ?? []) as Row[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className={ui.h1}>E-Forms</h1>
        <p className={ui.sub}>The same forms as the MDT. {manager ? 'Every submitted form is listed.' : 'Forms you have filed are listed.'}</p>
      </div>

      {error && <p className={ui.warn}>E-Forms are not set up yet. Run supabase/met-portal.sql in Supabase.</p>}

      <section className="space-y-3">
        <h2 className={ui.eyebrow}>New form</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {order.filter((k) => defs[k]).map((k) => (
            <Link key={k} href={`/met-police/eforms/new/${k}`} className="border border-slate-200 rounded-lg px-4 py-3 hover:border-[#00247D]/50 hover:bg-blue-50/40 transition-colors">
              <p className="font-bold text-slate-900 text-sm">{defs[k].title}</p>
              {defs[k].desc && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{defs[k].desc}</p>}
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className={ui.eyebrow}>{manager ? 'Submitted forms' : 'My submitted forms'}</h2>
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr><th className={ui.th}>Ref</th><th className={ui.th}>Form</th>{manager && <th className={ui.th}>Officer</th>}<th className={ui.th}>Submitted</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">No forms submitted.</td></tr>}
              {rows.map((f) => {
                const [label, colour] = EFORM_STATUS[f.status] ?? EFORM_STATUS.waiting;
                return (
                  <tr key={f.ref} className="hover:bg-blue-50/50">
                    <td className="px-4 py-2 font-mono"><Link href={`/met-police/eforms/view/${f.ref}`} className="text-[#00247D] font-semibold hover:underline">{f.ref}</Link></td>
                    <td className="px-4 py-2">
                      {f.title}{f.photos ? ` (${f.photos} photo${f.photos > 1 ? 's' : ''})` : ''}
                      <p className={`text-[11px] font-bold ${colour}`}>{label}</p>
                    </td>
                    {manager && <td className="px-4 py-2 text-slate-600">{f.officer_name || '-'}</td>}
                    <td className="px-4 py-2 text-slate-600">{f.form_date} {f.form_time}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
