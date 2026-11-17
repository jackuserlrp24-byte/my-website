import { getOfficer, canManageMet } from '@/lib/met-access';
import { supabaseAdmin } from '@/lib/portal';
import { searchPersons, searchVehicles, type PncPerson, type PncVehicle } from '@/lib/met-checks';
import { ui, when } from '@/lib/met-util';
import { addPerson, addVehicle, deleteRecord, runCheck } from './actions';

export const dynamic = 'force-dynamic';

const Marker = ({ text }: { text: string | null }) =>
  text ? (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {text.split(',').map((m) => m.trim()).filter(Boolean).map((m) => (
        <span key={m} className={`${ui.pill} text-red-700 border-red-200 bg-red-50`}>{m}</span>
      ))}
    </div>
  ) : null;

export default async function ChecksPage({ searchParams }: { searchParams: Promise<{ kind?: string; q?: string }> }) {
  const { kind, q } = await searchParams;
  const officer = (await getOfficer())!;
  const manager = canManageMet(officer);

  const query = (q ?? '').slice(0, 80);
  let persons: PncPerson[] = [];
  let vehicles: PncVehicle[] = [];
  if (query && kind === 'vehicle') vehicles = await searchVehicles(query);
  else if (query && kind === 'person') persons = await searchPersons(query);

  const { data: log, error } = await supabaseAdmin
    .from('met_check_log')
    .select('id, created_at, kind, query, found')
    .eq('officer_id', officer.id)
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <div className="space-y-8">
      <div>
        <h1 className={ui.h1}>Checks</h1>
        <p className={ui.sub}>
          Person and vehicle checks. <span className="font-semibold">This is a simulation</span> - it only searches the roleplay records that command has entered, and every check you run is logged.
        </p>
      </div>

      {error && <p className={ui.warn}>Checks are not set up yet. Run supabase/met-portal.sql in Supabase.</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <form action={runCheck} className={ui.panel}>
          <input type="hidden" name="kind" value="person" />
          <p className="text-sm font-bold text-slate-900">Person check</p>
          <input name="q" required maxLength={80} placeholder="Name" defaultValue={kind === 'person' ? query : ''} className={ui.input} />
          <button type="submit" className={ui.btn}>Run check</button>
        </form>
        <form action={runCheck} className={ui.panel}>
          <input type="hidden" name="kind" value="vehicle" />
          <p className="text-sm font-bold text-slate-900">Vehicle check</p>
          <input name="q" required maxLength={20} placeholder="Registration" defaultValue={kind === 'vehicle' ? query : ''} className={`${ui.input} uppercase`} />
          <button type="submit" className={ui.btn}>Run check</button>
        </form>
      </div>

      {query && (kind === 'person' || kind === 'vehicle') && (
        <section className="space-y-3">
          <h2 className={ui.eyebrow}>Result for &ldquo;{query}&rdquo;</h2>
          {kind === 'person' &&
            (persons.length === 0 ? (
              <p className={ui.empty}>No trace on record.</p>
            ) : (
              persons.map((p) => (
                <article key={p.id} className={ui.card}>
                  <p className="text-base font-bold text-slate-900">{p.full_name}</p>
                  <p className="text-sm text-slate-600">
                    {p.dob ? `DOB ${p.dob}` : 'DOB not recorded'}
                    {p.address ? ` · ${p.address}` : ''}
                  </p>
                  <Marker text={p.markers} />
                  {p.notes && <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{p.notes}</p>}
                </article>
              ))
            ))}
          {kind === 'vehicle' &&
            (vehicles.length === 0 ? (
              <p className={ui.empty}>No trace on record.</p>
            ) : (
              vehicles.map((v) => (
                <article key={v.id} className={ui.card}>
                  <p className="text-base font-bold text-slate-900 font-mono">{v.registration}</p>
                  <p className="text-sm text-slate-600">
                    {[v.colour, v.make_model].filter(Boolean).join(' ') || 'Vehicle details not recorded'}
                    {v.keeper ? ` · Keeper: ${v.keeper}` : ''}
                  </p>
                  {v.status && <p className="text-sm text-slate-700 mt-1">{v.status}</p>}
                  <Marker text={v.markers} />
                  {v.notes && <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{v.notes}</p>}
                </article>
              ))
            ))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className={ui.eyebrow}>My recent checks</h2>
        {(log ?? []).length === 0 ? (
          <p className="text-xs text-slate-400">You have not run any checks.</p>
        ) : (
          <ul className="text-sm text-slate-700 space-y-1">
            {(log ?? []).map((l) => (
              <li key={l.id}>
                <span className="text-xs text-slate-400">{when(l.created_at)} · </span>
                {l.kind === 'vehicle' ? 'Vehicle' : 'Person'}: {l.query} <span className="text-xs text-slate-400">({l.found ? 'record found' : 'no trace'})</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {manager && (
        <section className="space-y-4 border-t border-slate-200 pt-6">
          <h2 className={ui.eyebrow}>Command: manage records</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form action={addPerson} className={ui.panel}>
              <p className="text-sm font-bold text-slate-900">Add a person</p>
              <input name="full_name" required maxLength={120} placeholder="Full name" className={ui.input} />
              <input name="dob" maxLength={30} placeholder="Date of birth" className={ui.input} />
              <input name="address" maxLength={200} placeholder="Address" className={ui.input} />
              <input name="markers" maxLength={200} placeholder="Markers, comma separated (Violent, Wanted)" className={ui.input} />
              <textarea name="notes" rows={2} maxLength={1000} placeholder="Notes" className={`${ui.input} resize-y`} />
              <button type="submit" className={ui.btn}>Save person</button>
            </form>
            <form action={addVehicle} className={ui.panel}>
              <p className="text-sm font-bold text-slate-900">Add a vehicle</p>
              <input name="registration" required maxLength={20} placeholder="Registration" className={`${ui.input} uppercase`} />
              <div className="grid grid-cols-2 gap-2">
                <input name="make_model" maxLength={100} placeholder="Make / model" className={ui.input} />
                <input name="colour" maxLength={40} placeholder="Colour" className={ui.input} />
              </div>
              <input name="keeper" maxLength={120} placeholder="Registered keeper" className={ui.input} />
              <input name="status" maxLength={120} placeholder="Status (Insured, MOT valid / Stolen)" className={ui.input} />
              <input name="markers" maxLength={200} placeholder="Markers, comma separated" className={ui.input} />
              <textarea name="notes" rows={2} maxLength={1000} placeholder="Notes" className={`${ui.input} resize-y`} />
              <button type="submit" className={ui.btn}>Save vehicle</button>
            </form>
          </div>
          <RecordList />
        </section>
      )}
    </div>
  );
}

async function RecordList() {
  const [p, v] = await Promise.all([
    supabaseAdmin.from('met_pnc_persons').select('id, full_name').order('created_at', { ascending: false }).limit(30),
    supabaseAdmin.from('met_pnc_vehicles').select('id, registration').order('created_at', { ascending: false }).limit(30),
  ]);
  const rows = [
    ...(p.data ?? []).map((r) => ({ id: r.id as string, table: 'person', label: r.full_name as string })),
    ...(v.data ?? []).map((r) => ({ id: r.id as string, table: 'vehicle', label: r.registration as string })),
  ];
  if (rows.length === 0) return <p className="text-xs text-slate-400">No records added yet.</p>;
  return (
    <ul className="text-sm text-slate-700 divide-y divide-slate-100 border border-slate-200 rounded-lg">
      {rows.map((r) => (
        <li key={`${r.table}-${r.id}`} className="flex items-center justify-between px-4 py-2">
          <span>
            <span className="text-xs text-slate-400 uppercase mr-2">{r.table}</span>
            {r.label}
          </span>
          <form action={deleteRecord}>
            <input type="hidden" name="id" value={r.id} />
            <input type="hidden" name="table" value={r.table} />
            <button type="submit" className={ui.danger}>Delete</button>
          </form>
        </li>
      ))}
    </ul>
  );
}
