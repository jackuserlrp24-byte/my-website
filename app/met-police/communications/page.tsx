import Link from 'next/link';
import { getOfficer, canManageMet } from '@/lib/met-access';
import { getOfficerOptions } from '@/lib/met-officers';
import { supabaseAdmin } from '@/lib/portal';
import { ui, when } from '@/lib/met-util';
import { deleteAnnouncement, postAnnouncement } from '../announcements/actions';
import { markRead, sendMessage } from './actions';

export const dynamic = 'force-dynamic';

interface Notice {
  id: string;
  created_at: string;
  title: string;
  body: string;
  author: string | null;
  pinned: boolean;
  kind: string | null;
}
interface Message {
  id: string;
  created_at: string;
  from_name: string | null;
  to_name: string | null;
  subject: string;
  body: string;
  read_at: string | null;
}

export default async function CommunicationsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const officer = (await getOfficer())!;
  const manager = canManageMet(officer);
  const active = tab === 'messages' ? 'messages' : 'notices';

  const [notices, inbox, sent, options] = await Promise.all([
    supabaseAdmin.from('met_announcements').select('id, created_at, title, body, author, pinned, kind').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(50),
    supabaseAdmin.from('met_messages').select('id, created_at, from_name, to_name, subject, body, read_at').eq('to_id', officer.id).order('created_at', { ascending: false }).limit(50),
    supabaseAdmin.from('met_messages').select('id, created_at, from_name, to_name, subject, body, read_at').eq('from_id', officer.id).order('created_at', { ascending: false }).limit(25),
    active === 'messages' ? getOfficerOptions() : Promise.resolve([]),
  ]);

  const items = (notices.data ?? []) as Notice[];
  const received = (inbox.data ?? []) as Message[];
  const sentItems = (sent.data ?? []) as Message[];
  const unread = received.filter((m) => !m.read_at).length;

  const tabClass = (on: boolean) =>
    `px-4 py-2 text-sm font-semibold rounded-md border ${on ? 'bg-[#00247D] text-white border-[#00247D]' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className={ui.h1}>Communications</h1>
        <p className={ui.sub}>Notices and bulletins from command, and internal messages between officers.</p>
      </div>

      <div className="flex gap-2">
        <Link href="/met-police/communications" className={tabClass(active === 'notices')}>Notices &amp; bulletins</Link>
        <Link href="/met-police/communications?tab=messages" className={tabClass(active === 'messages')}>
          Messages{unread > 0 ? ` (${unread})` : ''}
        </Link>
      </div>

      {active === 'notices' && (
        <>
          {manager && !notices.error && (
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
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" name="pinned" /> Pin to the top
                </label>
                <button type="submit" className={ui.btn}>Post</button>
              </div>
            </form>
          )}

          {notices.error ? (
            <p className={ui.warn}>Notices are not set up yet. Run supabase/met-announcements.sql and supabase/met-portal.sql in Supabase.</p>
          ) : items.length === 0 ? (
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
                    {manager && (
                      <form action={deleteAnnouncement}>
                        <input type="hidden" name="id" value={a.id} />
                        <button type="submit" className={ui.danger}>Delete</button>
                      </form>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap">{a.body}</p>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {active === 'messages' && (
        <>
          {inbox.error && <p className={ui.warn}>Messages are not set up yet. Run supabase/met-portal.sql in Supabase.</p>}

          <form action={sendMessage} className={ui.panel}>
            <p className={ui.eyebrow}>New message</p>
            <select name="to" required defaultValue="" className={ui.input}>
              <option value="" disabled>To...</option>
              {options.filter((o) => o.discord_id !== officer.id).map((o) => (
                <option key={o.discord_id} value={o.discord_id}>{o.label}</option>
              ))}
            </select>
            <input name="subject" required maxLength={120} placeholder="Subject" className={ui.input} />
            <textarea name="body" required rows={4} maxLength={3000} placeholder="Message" className={`${ui.input} resize-y`} />
            <button type="submit" className={ui.btn}>Send</button>
          </form>

          <section className="space-y-3">
            <h2 className={ui.eyebrow}>Inbox</h2>
            {received.length === 0 ? (
              <p className={ui.empty}>No messages.</p>
            ) : (
              received.map((m) => (
                <article key={m.id} className={`${ui.card} ${m.read_at ? '' : 'border-[#00247D]/40 bg-blue-50/40'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{m.subject}</p>
                      <p className="text-xs text-slate-500">From {m.from_name || 'Officer'} &middot; {when(m.created_at)}</p>
                    </div>
                    {!m.read_at && (
                      <form action={markRead}>
                        <input type="hidden" name="id" value={m.id} />
                        <button type="submit" className={ui.btnGhost}>Mark as read</button>
                      </form>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{m.body}</p>
                </article>
              ))
            )}
          </section>

          <section className="space-y-3">
            <h2 className={ui.eyebrow}>Sent</h2>
            {sentItems.length === 0 ? (
              <p className="text-xs text-slate-400">You have not sent any messages.</p>
            ) : (
              sentItems.map((m) => (
                <article key={m.id} className={ui.card}>
                  <p className="text-sm font-bold text-slate-900">{m.subject}</p>
                  <p className="text-xs text-slate-500">To {m.to_name || 'Officer'} &middot; {when(m.created_at)}{m.read_at ? ' · read' : ''}</p>
                  <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{m.body}</p>
                </article>
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}
