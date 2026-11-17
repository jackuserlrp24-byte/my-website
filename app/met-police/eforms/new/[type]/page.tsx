import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEformDefs } from '@/lib/mdt-eforms';
import { ui } from '@/lib/met-util';
import { submitEform } from '../../actions';

export const dynamic = 'force-dynamic';

export default async function NewEformPage({ params, searchParams }: { params: Promise<{ type: string }>; searchParams: Promise<{ err?: string }> }) {
  const { type } = await params;
  const { err } = await searchParams;
  const { defs } = await getEformDefs();
  const def = defs[type];
  if (!def) notFound();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href="/met-police/eforms" className="text-xs font-semibold text-[#00247D] hover:underline">&larr; E-Forms</Link>
        <h1 className={`${ui.h1} mt-2`}>{def.title}</h1>
        {def.desc && <p className={ui.sub}>{def.desc}</p>}
      </div>
      {err && <p className={ui.warn}>{err}</p>}

      <form action={submitEform} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input type="hidden" name="_type" value={type} />
        {def.fields.map((f) => {
          if (f.t === 'heading') return <h2 key={f.k} className="sm:col-span-2 text-sm font-bold text-[#00247D] border-b border-slate-200 pb-1 mt-2">{f.l}</h2>;
          if (f.t === 'note') return <p key={f.k} className="sm:col-span-2 text-xs text-slate-500">{f.l}</p>;
          const wide = f.t === 'area' || f.t === 'checks' || f.w === 'full';
          return (
            <div key={f.k} className={wide ? 'sm:col-span-2' : ''}>
              <label className={ui.label}>{f.l}{f.req ? ' *' : ''}</label>
              {f.t === 'area' ? (
                <textarea name={f.k} rows={4} maxLength={3000} className={`${ui.input} resize-y`} />
              ) : f.t === 'select' ? (
                <select name={f.k} defaultValue={f.o?.[0]} className={ui.input}>
                  {(f.o ?? []).map((o) => <option key={o}>{o}</option>)}
                </select>
              ) : f.t === 'checks' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 border border-slate-200 rounded-md p-3 bg-slate-50">
                  {(f.o ?? []).map((o) => (
                    <label key={o} className="flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" name={f.k} value={o} className="mt-1" /> {o}</label>
                  ))}
                </div>
              ) : (
                <input name={f.k} type={f.t === 'number' ? 'number' : f.t === 'date' ? 'date' : f.t === 'time' ? 'time' : 'text'} maxLength={f.max || 500} className={ui.input} />
              )}
            </div>
          );
        })}
        <div className="sm:col-span-2 flex items-center gap-3">
          <button type="submit" className={ui.btn}>Submit form</button>
          <p className="text-xs text-slate-500">Photos can be added to forms in the MDT.</p>
        </div>
      </form>
    </div>
  );
}
