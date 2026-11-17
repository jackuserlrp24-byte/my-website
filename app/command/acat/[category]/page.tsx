import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { canViewAcat, getOfficer } from '@/lib/met-access';
import { ACAT_STATUS, ACAT_STATUS_LABEL, ACAT_STATUS_STYLE, acatCategory } from '@/lib/met-acat';
import { supabaseAdmin } from '@/lib/portal';
import { ui, when } from '@/lib/met-util';
import { addEntry, deleteEntry, setStatus } from '../actions';

export const dynamic = 'force-dynamic';

interface Entry {
  id: string;
  created_at: string;
  reference: string;
  title: string;
  details: string;
  status: string;
  created_by_name: string | null;
}

export default async function AcatCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const officer = (await getOfficer())!;
  if (!canViewAcat(officer)) redirect('/command');

  const { category } = await params;
  const cat = acatCategory(category);
  if (!cat) notFound();

  const list = await supabaseAdmin.from('met_acat_entries').select('*').eq('category', cat.slug).order('created_at', { ascending: false }).limit(200);
  const rows = (list.data ?? []) as Entry[];

  return (
    <div className="space-y-8">
      <div>
        <Link href="/command/acat" className="text-xs font-semibold text-[#00247D] hover:underline">&larr; Anti-Corruption &amp; Abuse Team</Link>
        <h1 className={`${ui.h1} mt-2`}>{cat.title}</h1>
        <p className={ui.sub}>{cat.text} Visible to ACAT and Gold Command only.</p>
      </div>

      {list.error && <p className={ui.warn}>This section is not set up yet. Run supabase/met-portal.sql in Supabase.</p>}

      <form action={addEntry} className={ui.panel}>
        <input type="hidden" name="category" value={cat.slug} />
        <p className={ui.eyebrow}>New entry</p>
        <input name="title" required maxLength={160} placeholder="Title" className={ui.input} />
        <textarea name="details" required rows={4} maxLength={4000} placeholder="Details" className={`${ui.input} resize-y`} />
        <button type="submit" className={ui.btn}>Save entry</button>
      </form>

      {rows.length === 0 ? (
        <p className={ui.empty}>Nothing here yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className={ui.card}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-mono text-slate-500">{r.reference}</p>
                  <p className="font-bold text-slate-900">{r.title}</p>
                  <p className="text-xs text-slate-500">{when(r.created_at)} by {r.created_by_name || 'Unknown'}</p>
                </div>
                <span className={`${ui.pill} ${ACAT_STATUS_STYLE[r.status]}`}>{ACAT_STATUS_LABEL[r.status]}</span>
              </div>
              <p className="text-sm text-slate-700 mt-3 whitespace-pre-line">{r.details}</p>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <form action={setStatus} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="category" value={cat.slug} />
                  <select name="status" defaultValue={r.status} className="border border-slate-300 rounded-md px-2 py-1 text-xs bg-white">
                    {ACAT_STATUS.map((s) => (
                      <option key={s} value={s}>{ACAT_STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                  <button type="submit" className={ui.btnGhost}>Update</button>
                </form>
                <form action={deleteEntry}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="category" value={cat.slug} />
                  <button type="submit" className={ui.danger}>Delete</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
