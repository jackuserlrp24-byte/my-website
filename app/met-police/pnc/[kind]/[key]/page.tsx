import Link from 'next/link';
import { notFound } from 'next/navigation';
import { canManageMet, getOfficer } from '@/lib/met-access';
import { supabaseAdmin } from '@/lib/portal';
import { personName, warningsFor } from '@/lib/mdt';
import { ui } from '@/lib/met-util';
import { addEntry } from '../../actions';

export const dynamic = 'force-dynamic';

const TABS = [
  { key: 'summary', label: 'Summary' },
  { key: 'warnings', label: 'Warning Markers' },
  { key: 'info', label: 'Information Markers' },
  { key: 'history', label: 'Record History' },
  { key: 'intel', label: 'Intelligence' },
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-2 border-b border-slate-100 text-sm">
      <b className="w-44 shrink-0 text-slate-600">{label}</b>
      <span className="text-slate-900">{children}</span>
    </div>
  );
}

export default async function PncRecordPage({ params, searchParams }: { params: Promise<{ kind: string; key: string }>; searchParams: Promise<{ tab?: string }> }) {
  const officer = (await getOfficer())!;
  const { kind: rawKind, key: rawKey } = await params;
  const kind: 'person' | 'vehicle' = rawKind === 'vehicle' ? 'vehicle' : 'person';
  const key = decodeURIComponent(rawKey);
  const tab = TABS.some((t) => t.key === (await searchParams).tab) ? (await searchParams).tab! : 'summary';

  const { data: row } = await supabaseAdmin.from('mdt_pnc_records').select('data').eq('kind', kind).eq('key', key).maybeSingle();
  if (!row) notFound();
  const d = row.data as Record<string, any>;
  const isVeh = kind === 'vehicle';
  const warnings = warningsFor(kind, d);
  const lists: Record<string, any[]> = { warnings, info: d.info ?? [], history: d.history ?? [], intel: d.intel ?? [] };

  // Keeper (vehicle) or registered vehicles (person)
  let keeper: { key: string; name: string } | null = null;
  let vehicles: Record<string, any>[] = [];
  if (isVeh && d.keeperId) {
    const k = await supabaseAdmin.from('mdt_pnc_records').select('key, data').eq('kind', 'person').eq('key', String(d.keeperId)).maybeSingle();
    if (k.data) keeper = { key: k.data.key, name: personName(k.data.data as Record<string, any>) };
  }
  if (!isVeh) {
    const v = await supabaseAdmin.from('mdt_pnc_records').select('data').eq('kind', 'vehicle').eq('data->>keeperId', String(d.id)).limit(20);
    vehicles = (v.data ?? []).map((x: any) => x.data);
  }

  const title = isVeh ? d.vrm : personName(d);
  const opened = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date());
  const base = `/met-police/pnc/${kind}/${encodeURIComponent(key)}`;
  const flash = warnings.length ? 'animate-pulse text-red-700 font-bold' : '';

  return (
    <div className="space-y-5">
      <div>
        <Link href={`/met-police/pnc?type=${kind}`} className="text-xs font-semibold text-[#00247D] hover:underline">&larr; Search Results</Link>
        <p className="text-xs text-slate-500 mt-2">Search Results Info | Date opened: {opened.split(',')[0]} | Time opened: {opened.split(',')[1]?.trim()}</p>
        <h1 className={`${ui.h1} mt-1`}>{title}</h1>
      </div>

      <div className="border border-slate-200 rounded-lg p-4 text-sm space-y-1 bg-slate-50">
        <p className={flash}>{warnings.length ? '\u26A0 ' : ''}Warning Markers: <em>{warnings.join(', ')}</em></p>
        <p>Information Markers: <em>{(d.info ?? []).join(', ')}</em></p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-5 items-start">
        <nav className="flex md:flex-col gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const n = t.key === 'summary' ? 0 : lists[t.key].length;
            return (
              <Link key={t.key} href={`${base}?tab=${t.key}`} className={`whitespace-nowrap flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-semibold rounded-md border-l-4 ${tab === t.key ? 'bg-blue-50 text-[#00247D] border-[#00247D]' : 'text-slate-600 border-transparent hover:bg-slate-100'} ${t.key === 'warnings' && n ? 'animate-pulse text-red-700' : ''}`}>
                {t.label}
                {n > 0 && <b className="text-[11px] bg-[#00247D] text-white rounded-full px-2 py-0.5">{n}</b>}
              </Link>
            );
          })}
        </nav>

        <div className="border border-slate-200 rounded-lg">
          <p className="px-5 py-3 border-b border-slate-200 bg-slate-50 text-sm font-bold">{TABS.find((t) => t.key === tab)!.label === 'Summary' ? 'General information' : TABS.find((t) => t.key === tab)!.label}</p>
          <div className="px-5 py-2">
            {tab === 'summary' && isVeh && (
              <>
                <Row label="VRM">{d.vrm}</Row>
                <Row label="Named Keeper">{keeper ? <Link className="text-[#00247D] hover:underline" href={`/met-police/pnc/person/${keeper.key}`}>{keeper.name}</Link> : 'Unknown'}</Row>
                <Row label="Make">{d.make}</Row><Row label="Model">{d.model}</Row><Row label="Colour">{d.colour}</Row>
                <Row label="Tax">{d.tax || 'Unknown'}</Row><Row label="MOT">{d.mot || 'Unknown'}</Row><Row label="Insurance">{d.insurance || 'Unknown'}</Row>
              </>
            )}
            {tab === 'summary' && !isVeh && (
              <>
                <Row label="PNC #">{d.id}</Row><Row label="ID Number">{d.identId || 'Not issued'}</Row>
                <Row label="Surname">{d.last}</Row><Row label="Forename">{d.first}</Row>
                <Row label="Date of Birth">{d.dob}</Row><Row label="Sex">{d.sex}</Row><Row label="Address">{d.address || 'Not recorded'}</Row>
                {vehicles.map((v, i) => (
                  <Row key={v.vrm} label={i === 0 ? 'Registered Vehicles' : ''}>
                    <Link className="text-[#00247D] hover:underline" href={`/met-police/pnc/vehicle/${encodeURIComponent(v.vrm)}`}>{v.vrm}</Link> {v.make} {v.model}
                  </Row>
                ))}
              </>
            )}
            {tab !== 'summary' && (lists[tab].length === 0 ? (
              <p className="py-6 text-sm text-slate-500">No records.</p>
            ) : (
              lists[tab].map((x, i) =>
                typeof x === 'string' ? <p key={i} className="py-2 border-b border-slate-100 text-sm">{x}</p> : <Row key={i} label={x.date || ''}>{x.text}</Row>,
              )
            ))}
          </div>
          {tab !== 'summary' && canManageMet(officer) && (
            <form action={addEntry} className="px-5 py-4 border-t border-slate-200 flex gap-2">
              <input type="hidden" name="kind" value={kind} />
              <input type="hidden" name="key" value={key} />
              <input type="hidden" name="tab" value={tab} />
              <input name="text" required maxLength={300} placeholder="Add a line (command only)" className={ui.input} />
              <button type="submit" className={ui.btn}>Add</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
