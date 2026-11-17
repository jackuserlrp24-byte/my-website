import Link from 'next/link';
import { notFound } from 'next/navigation';
import { canManageMet, getOfficer } from '@/lib/met-access';
import { EFORM_STATUS } from '@/lib/mdt';
import { getEformDefs } from '@/lib/mdt-eforms';
import { supabaseAdmin } from '@/lib/portal';
import { ui } from '@/lib/met-util';

export const dynamic = 'force-dynamic';

export default async function ViewEformPage({ params }: { params: Promise<{ ref: string }> }) {
  const officer = (await getOfficer())!;
  const { ref } = await params;
  const { data } = await supabaseAdmin.from('mdt_eforms').select('*').eq('ref', decodeURIComponent(ref)).maybeSingle();
  if (!data) notFound();
  // Command can open any form. An officer can open the forms they filed.
  if (!canManageMet(officer) && data.author_id !== officer.id) notFound();

  const { defs } = await getEformDefs();
  const def = defs[data.type];
  const fields = (data.fields ?? {}) as Record<string, string>;
  const [label, colour] = EFORM_STATUS[data.status] ?? EFORM_STATUS.waiting;
  const shown = def ? def.fields.filter((f) => f.t !== 'heading' && f.t !== 'note') : Object.keys(fields).map((k) => ({ k, l: k, t: 'text' }));

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href="/met-police/eforms" className="text-xs font-semibold text-[#00247D] hover:underline">&larr; E-Forms</Link>
        <h1 className={`${ui.h1} mt-2`}>{data.title}</h1>
        <p className="text-sm text-slate-500 mt-1 font-mono">{data.ref}</p>
        <p className="text-sm text-slate-500">Filed {data.form_date} {data.form_time}{data.officer_name ? ` by ${data.officer_name}` : ''}{data.callsign ? ` (${data.callsign})` : ''}</p>
        <p className={`text-xs font-bold mt-1 ${colour}`}>{label}</p>
      </div>
      {data.ask && <p className={ui.warn}><b>Changes requested:</b> {data.ask}</p>}
      <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
        {shown.map((f) => (
          <div key={f.k} className="px-5 py-3 grid grid-cols-1 sm:grid-cols-[220px_minmax(0,1fr)] gap-1 sm:gap-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{f.l}</p>
            <p className="text-sm text-slate-900 whitespace-pre-line break-words">{fields[f.k] || '-'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
