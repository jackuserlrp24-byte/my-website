import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function postNotice(formData: FormData) {
  'use server';
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const author = formData.get('author') as string;

  if (!title || !content) return;

  try {
    await supabase.from('community_notices').insert([
      { title, content, author_name: author || 'Management' }
    ]);
  } catch (err) {
    console.error('Failed to post notice:', err);
  }

  revalidatePath('/dashboard/management');
  revalidatePath('/dashboard');
}

async function issueModeration(formData: FormData) {
  'use server';
  const discordId = formData.get('discordId') as string;
  const username = formData.get('username') as string;
  const actionType = formData.get('actionType') as string;
  const reason = formData.get('reason') as string;
  const moderator = formData.get('moderator') as string;

  if (!discordId || !reason) return;

  try {
    await supabase.from('moderation_logs').insert([
      { discord_id: discordId, username: username || 'Unknown', action_type: actionType, reason, moderator_name: moderator || 'Management' }
    ]);
  } catch (err) {
    console.error('Failed to log moderation action:', err);
  }

  revalidatePath('/dashboard/management');
}

export default async function ManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('discord_user')?.value;
  const user = userCookie ? JSON.parse(userCookie) : { username: 'Management Operator' };
  const currentModName = user.nickname || user.username;

  const resolvedSearchParams = await searchParams;
  const searchQuery = resolvedSearchParams.search || '';

  let notices: any[] = [];
  let moderationLogs: any[] = [];

  try {
    let modQuery = supabase
      .from('moderation_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (searchQuery) {
      modQuery = modQuery.or(`discord_id.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`);
    }

    const [noticesRes, moderationRes] = await Promise.all([
      supabase.from('community_notices').select('*').order('created_at', { ascending: false }).limit(10),
      modQuery.limit(20)
    ]);

    notices = noticesRes.data || [];
    moderationLogs = moderationRes.data || [];
  } catch (err) {
    console.error('Supabase connection/query error:', err);
  }

  return (
    <div className="flex flex-col px-8 mt-4 max-w-[1450px] mx-auto w-full gap-6">
      {/* Header Banner */}
      <div className="w-full bg-neutral-900/90 border border-neutral-800 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-red-600" />
        <h2 className="text-2xl font-bold tracking-tight text-neutral-100 font-mono uppercase">
          Command & Management Portal
        </h2>
        <p className="text-xs text-neutral-400 mt-1 font-mono">
          Authorize community announcements and inspect user moderation history, warnings, and bans.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 1: Post Community Notices */}
        <div className="bg-neutral-900/80 border border-neutral-800 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-200 mb-4 pb-2 border-b border-neutral-800 font-mono">
              📢 Publish Community Notice
            </h3>
            <form action={postNotice} className="space-y-4">
              <input type="hidden" name="author" value={currentModName} />
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                  Notice Title
                </label>
                <input 
                  type="text" 
                  name="title" 
                  required 
                  placeholder="e.g. Mandatory Patrol Briefing & Updates"
                  className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                  Notice Content / Body
                </label>
                <textarea 
                  name="content" 
                  rows={4} 
                  required 
                  placeholder="Enter notice details for community members..."
                  className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-none focus:border-red-500 resize-none"
                />
              </div>
              <button 
                type="submit"
                className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer font-mono"
              >
                Broadcast Notice
              </button>
            </form>
          </div>

          {/* Active Notices List */}
          <div className="mt-6 pt-4 border-t border-neutral-800">
            <h4 className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest mb-3">
              Recent Live Notices ({notices.length})
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {notices.length > 0 ? (
                notices.map((notice) => (
                  <div key={notice.id} className="bg-neutral-950 border border-neutral-800 p-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-neutral-200">{notice.title}</span>
                      <span className="text-[10px] font-mono text-neutral-500">{new Date(notice.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-neutral-400 line-clamp-2">{notice.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-neutral-500 italic font-mono">No active notices published or Supabase tables not found.</p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: Issue Moderation Log (Warn / Ban) */}
        <div className="bg-neutral-900/80 border border-neutral-800 p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-200 mb-4 pb-2 border-b border-neutral-800 font-mono">
            ⚖️ Issue Moderation Action
          </h3>
          <form action={issueModeration} className="space-y-4">
            <input type="hidden" name="moderator" value={currentModName} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                  Target Discord ID
                </label>
                <input 
                  type="text" 
                  name="discordId" 
                  required 
                  placeholder="e.g. 1268680281896910910"
                  className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                  Username / Handle
                </label>
                <input 
                  type="text" 
                  name="username" 
                  placeholder="e.g. J.Costin"
                  className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                  Action Type
                </label>
                <select 
                  name="actionType" 
                  className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value="WARN">WARNING</option>
                  <option value="BAN">BAN / SUSPENSION</option>
                  <option value="NOTE">STAFF NOTE</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                Reason / Details
              </label>
              <textarea 
                name="reason" 
                rows={3} 
                required 
                placeholder="Specify infraction details or reason for action..."
                className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-none focus:border-red-500 resize-none"
              />
            </div>

            <button 
              type="submit"
              className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer font-mono"
            >
              Log Moderation Action
            </button>
          </form>
        </div>
      </div>

      {/* SECTION 3: User Moderation History Lookup Registry */}
      <div className="bg-neutral-900/80 border border-neutral-800 p-6 mt-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-3 border-b border-neutral-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-200 font-mono">
            🔍 Moderation History & Ban Registry
          </h3>
          
          <form method="GET" className="flex gap-2 w-full sm:w-auto">
            <input 
              type="text" 
              name="search" 
              defaultValue={searchQuery}
              placeholder="Search by Discord ID or Username..." 
              className="bg-neutral-950 border border-neutral-800 px-3 py-1.5 text-xs text-neutral-200 font-mono focus:outline-none focus:border-red-500 w-full sm:w-64"
            />
            <button 
              type="submit"
              className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold uppercase font-mono transition-colors"
            >
              Filter
            </button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 text-[10px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Date / Time</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">User</th>
                <th className="py-2.5 px-3">Discord ID</th>
                <th className="py-2.5 px-3">Reason</th>
                <th className="py-2.5 px-3">Moderator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
              {moderationLogs.length > 0 ? (
                moderationLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-950/50 transition-colors">
                    <td className="py-3 px-3 text-neutral-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('en-GB')}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-sm ${
                        log.action_type === 'BAN' 
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                          : log.action_type === 'WARN' 
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {log.action_type}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-neutral-200">{log.username}</td>
                    <td className="py-3 px-3 text-neutral-400 text-[11px]">{log.discord_id}</td>
                    <td className="py-3 px-3 max-w-xs truncate text-neutral-300" title={log.reason}>{log.reason}</td>
                    <td className="py-3 px-3 text-neutral-400">{log.moderator_name}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-neutral-500 italic">
                    No moderation records found (or ensure Supabase tables `community_notices` and `moderation_logs` are created).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}