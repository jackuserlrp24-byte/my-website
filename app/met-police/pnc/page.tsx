import Link from 'next/link';
import { supabaseAdmin } from '@/lib/portal';
import { normVrm, personName } from '@/lib/mdt';
import { ui } from '@/lib/met-util';
import { createRecord } from './actions';

export const dynamic = 'force-dynamic';

const clean = (t: string) => t.replace(/[%_,()\\]/g, ' ').trim().toLowerCase();

// PNC, copied from the MDT: Person / Vehicle search, results list, then the record with its tabs.
export default async function PncPage({ searchParams }: { searchParams: Promise<{ type?: string; q?: string; err?: string }> }) {
  const sp = await searchParams;
  const type: 'person' | 'vehicle' = sp.type === 'vehicle' ? 'vehicle' : 'person';
  const q = (sp.q ?? '').trim().slice(0, 60);
  const isVeh = type === 'vehicle';

  let query = supabaseAdmin.from('mdt_pnc_records').select('kind, key, data').eq('kind', type);
  if (q) {
    const tokens = (isVeh ? [normVrm(q).toLowerCase()] : q.split(/\s+/).map(clean)).filter(Boolean);
    for (const t of tokens) query = query.ilike('search', `%${t}%`);
    query = query.limit(50);
  } else {
    query = query.order('updated_at', { ascending: false }).limit(25);
  }
  const { data, error } = await query;
  const rows = (data ?? []) as { kind: string; key: string; data: Record<string, any> }[];

  // Named keepers for the vehicle list
  const keeperIds = isVeh ? Array.from(new Set(rows.map((r) => r.data.keeperId).filter(Boolean).map(String))) : [];
  const keepers = new Map<string, string>();
  if (keeperIds.length) {
    const k = await supabaseAdmin.from('mdt_pnc_records').select('key, data').eq('kind', 'person').in('key', keeperIds);
    for (const p of k.data ?? []) keepers.set(String(p.key), personName(p.data as Record<string, any>));
  }

  const title = q ? 'Search Results' : isVeh ? 'Recent Vehicles' : 'Recent Persons';

  return (
    <div className="space-y-6">
      <h1 className={ui.h1}>PNC</h1>

      <form method="get" className="flex flex-wrap items-center gap-2 border border-slate-200 rounded-lg bg-slate-50 p-3">
        <select name="type" defaultValue={type} className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
          <option value="person">Person</option>
          <option value="vehicle">Vehicle</option>
        </select>
        <input name="q" defaultValue={q} autoComplete="off" spellCheck={false} placeholder={isVeh ? 'VRM' : 'LASTNAME FIRSTNAME DDMMYYYY or ID NUMBER'} className={`${ui.input} flex-1 min-w-[220px] !w-auto`} />
        <button type="submit" className={ui.btn}>Search</button>
      </form>

      {sp.err && <p className={ui.warn}>{sp.err}</p>}
      {error && <p className={ui.warn}>PNC is not set up yet. Run supabase/met-portal.sql in Supabase.</p>}

      <div className="flex items-center justify-between">
        <p className={ui.eyebrow}>{title}</p>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              {isVeh ? (
                <>
                  <th className={ui.th}>VRM</th><th className={ui.th}>Make / Model</th><th className={ui.th}>Colour</th><th className={ui.th}>Named Keeper</th>
                </>
              ) : (
                <>
                  <th className={ui.th}>#</th><th className={ui.th}>ID</th><th className={ui.th}>Name</th><th className={ui.th}>Date of Birth</th><th className={ui.th}>Sex</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">{q ? 'No results found.' : isVeh ? 'No vehicles yet. Search for a VRM.' : 'No persons yet. Search for a name.'}</td></tr>
            )}
            {rows.map((r) => {
              const d = r.data;
              const href = `/met-police/pnc/${type}/${encodeURIComponent(r.key)}`;
              return isVeh ? (
                <tr key={r.key} className="hover:bg-blue-50/50">
                  <td className="px-4 py-2 font-mono"><Link href={href} className="text-[#00247D] font-semibold hover:underline">{d.vrm}</Link>{d.stolen && <span className="ml-2 text-red-600 text-xs font-bold">(STOLEN)</span>}</td>
                  <td className="px-4 py-2 text-slate-700">{d.make} {d.model}</td>
                  <td className="px-4 py-2 text-slate-700">{d.colour}</td>
                  <td className="px-4 py-2 text-slate-700">{(d.keeperId && keepers.get(String(d.keeperId))) || 'Unknown'}</td>
                </tr>
              ) : (
                <tr key={r.key} className="hover:bg-blue-50/50">
                  <td className="px-4 py-2 text-slate-600">{d.id}</td>
                  <td className="px-4 py-2 font-mono text-slate-600">{d.identId || ''}</td>
                  <td className="px-4 py-2">
                    <Link href={href} className="text-[#00247D] font-semibold hover:underline">{personName(d)}</Link>
                    {d.arrested && <span className="ml-1 text-slate-500">(Arrested {d.arrested})</span>}
                    {d.warrants?.length > 0 && <span className="ml-2 text-red-600 text-xs font-bold">(WANTED)</span>}
                  </td>
                  <td className="px-4 py-2 text-slate-700">{d.dob}</td>
                  <td className="px-4 py-2 text-slate-700">{d.sex}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <details className={ui.panel}>
        <summary className="cursor-pointer text-sm font-semibold text-[#00247D]">{isVeh ? '+ New Vehicle' : '+ New Person'}</summary>
        <form action={createRecord} className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input type="hidden" name="kind" value={type} />
          {isVeh ? (
            <>
              <div><label className={ui.label}>VRM</label><input name="vrm" required maxLength={8} className={ui.input} /></div>
              <div><label className={ui.label}>Named Keeper (PNC #, optional)</label><input name="keeperId" maxLength={10} className={ui.input} /></div>
              <div><label className={ui.label}>Make</label><input name="make" maxLength={30} className={ui.input} /></div>
              <div><label className={ui.label}>Model</label><input name="model" maxLength={30} className={ui.input} /></div>
              <div><label className={ui.label}>Colour</label><input name="colour" maxLength={20} className={ui.input} /></div>
            </>
          ) : (
            <>
              <div><label className={ui.label}>Forename</label><input name="first" required maxLength={30} className={ui.input} /></div>
              <div><label className={ui.label}>Surname</label><input name="last" required maxLength={30} className={ui.input} /></div>
              <div><label className={ui.label}>Date of Birth (DD/MM/YYYY)</label><input name="dob" required maxLength={10} placeholder="01/02/1990" className={ui.input} /></div>
              <div><label className={ui.label}>Sex</label><select name="sex" className={ui.input}><option>Male</option><option>Female</option></select></div>
              <div className="sm:col-span-2"><label className={ui.label}>Address</label><input name="address" maxLength={80} className={ui.input} /></div>
            </>
          )}
          <div className="sm:col-span-2"><button type="submit" className={ui.btn}>Save</button></div>
        </form>
      </details>
    </div>
  );
}
