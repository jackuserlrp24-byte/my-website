import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/portal';
import { gradeLetter, slugToRef, type MdtIncident } from '@/lib/mdt';
import { ui } from '@/lib/met-util';
import AutoRefresh from '../../AutoRefresh';

export const dynamic = 'force-dynamic';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-blue-200">{label}</p>
      <p className="text-sm font-semibold whitespace-pre-line break-words">{value}</p>
    </div>
  );
}

// The full incident screen from the MDT: blue incident card on the left, remarks log on the right.
export default async function IncidentPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const { data } = await supabaseAdmin.from('mdt_incidents').select('*').eq('cad_ref', slugToRef(ref)).maybeSingle();
  if (!data) notFound();
  const inc = data as MdtIncident;
  const letter = gradeLetter(inc.response_grade);
  const closed = inc.status === 'Closed';
  const time = `${String(inc.received || '00:00:00').slice(0, 5)} ${inc.received_date || ''}`.trim();
  const remarks = [...(inc.remarks ?? [])].reverse(); // newest first, like the MDT

  return (
    <div className="space-y-6">
      <AutoRefresh seconds={15} />
      <div>
        <Link href="/met-police/incidents" className="text-xs font-semibold text-[#00247D] hover:underline">&larr; Incidents</Link>
        <h1 className={`${ui.h1} mt-2`}>Incident {inc.cad_ref}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6 items-start">
        <div className="rounded-lg overflow-hidden bg-[#0033a0] text-white">
          <div className="px-5 py-4 bg-[#00247D] flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold tracking-wide">FULL INCIDENT ({letter})</p>
            <p className="text-xs text-blue-100">ID: {inc.cad_ref} &nbsp; {time}</p>
          </div>
          <div className="p-5 space-y-4">
            <Field label="Attendance Location" value={inc.location || 'Unknown'} />
            <Field label="Caller Name" value={inc.caller || 'Unknown'} />
            <Field label="Opening Codes" value={inc.title || ''} />
            <Field label="Frequency" value={inc.frequency || 'Pan-London'} />
            <Field label="Response Type" value={`${letter}-GRADE${inc.call_type === '101' || inc.call_type === '111' ? ` (${inc.call_type})` : ''}`} />
            <Field label="Opening Details" value={inc.details || ''} />
            <Field label="Status" value={closed ? 'Closed' : inc.status || 'New'} />
            {inc.officers?.length > 0 && <Field label="Units attached" value={inc.officers.map((o) => [o.callsign, o.name].filter(Boolean).join(' - ')).join('\n')} />}
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg">
          <p className="px-5 py-3 border-b border-slate-200 bg-slate-50 text-sm font-bold text-slate-900">Remarks</p>
          <div className="divide-y divide-slate-100">
            {remarks.length === 0 && <p className="px-5 py-10 text-center text-sm text-slate-500">No remarks yet.</p>}
            {remarks.map((r, i) => (
              <div key={i} className="px-5 py-3">
                <p className="text-xs font-semibold text-slate-500">
                  {r.stamp || ''}
                  {r.by ? ` - ${r.by}` : ''}
                </p>
                <p className={`text-sm mt-0.5 whitespace-pre-line ${r.system ? 'text-slate-500 italic' : 'text-slate-900'}`}>{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-400">Attaching, adding remarks and finalising an incident is done in the MDT. This page mirrors it.</p>
    </div>
  );
}
