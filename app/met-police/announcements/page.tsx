import { getOfficer, canManageMet } from '@/lib/met-access';
import { supabaseAdmin } from '@/lib/portal';
import { deleteAnnouncement, postAnnouncement } from './actions';

export const dynamic = 'force-dynamic';

const when = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export default async function AnnouncementsPage() {
  const officer = (await getOfficer())!;
  const manager = canManageMet(officer);

  const { data, error } = await supabaseAdmin
    .from('met_announcements')
    .select('id, created_at, title, body, author, pinned')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50);
  const items = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Announcements</h1>
        <p className="text-sm text-slate-500 mt-1">The latest news and orders from command.</p>
      </div>

      {manager && !error && (
        <form action={postAnnouncement} className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Post an announcement</p>
          <input name="title" required maxLength={120} placeholder="Title" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#00247D]" />
          <textarea name="body" required rows={4} maxLength={4000} placeholder="Write the announcement..." className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#00247D] resize-y" />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" name="pinned" /> Pin to the top
            </label>
            <button type="submit" className="px-4 py-2 bg-[#00247D] hover:bg-[#001a5c] text-white text-sm font-semibold rounded-md cursor-pointer">
              Post
            </button>
          </div>
        </form>
      )}

      {error ? (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-4 py-3">Announcements are not set up yet. Run supabase/met-announcements.sql in Supabase.</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500 border border-dashed border-slate-300 rounded-md px-4 py-10 text-center">No announcements yet.</p>
      ) : (
        <div className="space-y-4">
          {items.map((a) => (
            <article key={a.id} className={`border rounded-lg p-5 ${a.pinned ? 'border-[#00247D]/40 bg-blue-50/50' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  {a.pinned && <span className="text-[10px] font-bold uppercase tracking-widest text-[#00247D]">Pinned</span>}
                  <h2 className="text-lg font-bold text-slate-900">{a.title}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {a.author || 'Command'} &middot; {when(a.created_at)}
                  </p>
                </div>
                {manager && (
                  <form action={deleteAnnouncement}>
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" className="text-xs font-semibold text-red-600 hover:text-red-800 cursor-pointer">
                      Delete
                    </button>
                  </form>
                )}
              </div>
              <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap">{a.body}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
