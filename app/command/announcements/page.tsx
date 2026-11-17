import { redirect } from 'next/navigation';
import { canManageMet, getOfficer } from '@/lib/met-access';
import { supabaseAdmin } from '@/lib/portal';
import { ui, when } from '@/lib/met-util';
import { deleteAnnouncement, postAnnouncement } from '@/app/met-police/announcements/actions';

export const dynamic = 'force-dynamic';

interface Notice { id: string; created_at: string; title: string; body: string; author: string | null; pinned: boolean; kind: string | null }

// Command posts notices and bulletins here. Every officer reads them under Communications and in the notification bell.
export default async function CommandAnnouncementsPage() {
  const officer = (await getOfficer())!;
  if (!canManageMet(officer)) redirect('/command');

  const { data, error } = await supabaseAdmin.from('met_announcements').select('id, created_at, title, body, author, pinned, kind').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(50);
  const items = (data ?? []) as Notice[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className={ui.h1}>Announcements</h1>
        <p className={ui.sub}>Post notices and bulletins to every officer.</p>
      </div>

      {error && <p className={ui.warn}>Notices are not set up yet. Run supabase/met-portal.sql in Supabase.</p>}

      <form action={postAnnouncement} className={ui.panel}>
        <p className={ui.eyebrow}>Post a notice or bulletin</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input name="title" required maxLength={120} placeholder="Title" className={`${ui.input} sm:col-span-3`} />
          <select name="kind" defaultValue="notice" className={ui.input}>
            <option value="notice">Notice</option>
            <option value="bulletin">Bulletin</option>
          </select>
        </div>
        <textarea name="body" required rows={4} maxLength={4000} placeholder="Write it here..." className={`${ui.input} resize-y`} />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" name="pinned" /> Pin to the top</label>
          <button type="submit" className={ui.btn}>Post</button>
        </div>
      </form>

      {items.length === 0 ? (
        <p className={ui.empty}>Nothing posted yet.</p>
      ) : (
        <div className="space-y-4">
          {items.map((a) => (
            <article key={a.id} className={`border rounded-lg p-5 ${a.pinned ? 'border-[#00247D]/40 bg-blue-50/50' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    {a.pinned && <span className="text-[10px] font-bold uppercase tracking-widest text-[#00247D]">Pinned</span>}
                    <span className={`${ui.pill} ${a.kind === 'bulletin' ? 'text-purple-700 border-purple-200 bg-purple-50' : 'text-slate-600 border-slate-200 bg-slate-50'}`}>{a.kind === 'bulletin' ? 'Bulletin' : 'Notice'}</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-1">{a.title}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{a.author || 'Command'} &middot; {when(a.created_at)}</p>
                </div>
                <form action={deleteAnnouncement}>
                  <input type="hidden" name="id" value={a.id} />
                  <button type="submit" className={ui.danger}>Delete</button>
                </form>
              </div>
              <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap">{a.body}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
