import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const TARGET_CHANNEL_ID = '1532786346920247398';

// --- SERVER ACTIONS ---

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

async function createManagementPatrol(formData: FormData) {
  'use server';
  const title = formData.get('title') as string;
  const division = formData.get('division') as string;
  const date = formData.get('date') as string;
  const time = formData.get('time') as string;
  const lead = formData.get('lead') as string;
  const description = formData.get('description') as string;
  const creator = formData.get('creator') as string;

  if (!title || !division) return;

  const countRes = await supabase.from('patrols').select('id', { count: 'exact', head: true });
  const nextNum = (countRes.count || 0) + 1;
  const patrolId = `PAT-${nextNum < 10 ? `00${nextNum}` : nextNum < 100 ? `0${nextNum}` : nextNum}`;

  const portalLink = 'https://www.centraloperationsportal.com/dashboard/patrols';
  const embed = {
    title: `New Event : ${title}`,
    description: `${description || 'No additional details provided.'}\n\n**Book Attendance:**\nYou can book on or update your status through the portal here:\n${portalLink}`,
    color: 5793266,
    fields: [
      { name: 'Division', value: division, inline: true },
      { name: 'Shift Lead', value: lead || creator || 'Unassigned', inline: true },
      { name: 'Shift ID', value: patrolId, inline: true },
      { name: 'Date', value: date || 'TBD', inline: true },
      { name: 'Time', value: time || 'TBD', inline: true },
      { name: 'Status', value: 'UPCOMING', inline: true },
      { name: 'Booked On (0)', value: 'No personnel booked on yet.', inline: false },
      { name: 'Not Attending (0)', value: 'No personnel marked absent.', inline: false }
    ],
    footer: {
      text: `Central Operations Portal • Created by ${creator}`
    },
    timestamp: new Date().toISOString()
  };

  let discordMessageId = null;
  if (DISCORD_BOT_TOKEN) {
    const res = await fetch(`https://discord.com/api/v10/channels/${TARGET_CHANNEL_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });
    if (res.ok) {
      const msgData = await res.json();
      discordMessageId = msgData.id;
    }
  }

  await supabase.from('patrols').insert({
    id: patrolId,
    discord_message_id: discordMessageId,
    title,
    division,
    date,
    time,
    lead,
    description,
    status: 'UPCOMING',
    attending: [],
    unattending: []
  });

  revalidatePath('/dashboard/management');
  revalidatePath('/dashboard/patrols');
}

async function deletePatrol(formData: FormData) {
  'use server';
  const patrolId = formData.get('patrolId') as string;
  const messageId = formData.get('messageId') as string;

  if (!patrolId) return;

  if (messageId && DISCORD_BOT_TOKEN) {
    await fetch(`https://discord.com/api/v10/channels/${TARGET_CHANNEL_ID}/messages/${messageId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` }
    }).catch(() => {});
  }

  await supabase.from('patrols').delete().eq('id', patrolId);

  revalidatePath('/dashboard/management');
  revalidatePath('/dashboard/patrols');
}

async function fetchDiscordMemberInfo(userId: string) {
  if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID || !userId) return null;
  try {
    const [memberRes, rolesRes] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${userId}`, {
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
        next: { revalidate: 60 }
      }),
      fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/roles`, {
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
        next: { revalidate: 3600 }
      })
    ]);

    if (!memberRes.ok || !rolesRes.ok) return null;

    const member = await memberRes.json();
    const guildRoles = await rolesRes.json();

    const roleMap = new Map();
    guildRoles.forEach((r: { id: string; name: string; color: number }) => roleMap.set(r.id, { name: r.name, color: r.color }));

    const resolvedRoles = (member.roles || []).map((id: string) => {
      const r = roleMap.get(id);
      return r ? { id, name: r.name, color: r.color !== 0 ? `#${r.color.toString(16).padStart(6, '0')}` : '#a3a3a3' } : null;
    }).filter(Boolean);

    return {
      nickname: member.nick || null,
      username: member.user?.username || 'Unknown',
      avatar: member.user?.avatar ? `https://cdn.discordapp.com/avatars/${userId}/${member.user.avatar}.png` : null,
      joinedAt: member.joined_at || null,
      roles: resolvedRoles
    };
  } catch {
    return null;
  }
}

// --- PAGE COMPONENT ---

export default async function ManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; userQuery?: string }>;
}) {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('discord_user')?.value;
  const user = userCookie ? JSON.parse(userCookie) : { username: 'Management Operator' };
  const currentModName = user.nickname || user.username;

  const resolvedSearchParams = await searchParams;
  const modSearchQuery = resolvedSearchParams.search || '';
  const userSearchQuery = resolvedSearchParams.userQuery || '';

  let notices: any[] = [];
  let moderationLogs: any[] = [];
  let patrols: any[] = [];
  let searchedUsers: any[] = [];
  let selectedUserDossier: any = null;

  try {
    let modQuery = supabase.from('moderation_logs').select('*').order('created_at', { ascending: false });
    if (modSearchQuery) {
      modQuery = modQuery.or(`discord_id.ilike.%${modSearchQuery}%,username.ilike.%${modSearchQuery}%`);
    }

    const [noticesRes, moderationRes, patrolsRes] = await Promise.all([
      supabase.from('community_notices').select('*').order('created_at', { ascending: false }).limit(10),
      modQuery.limit(20),
      supabase.from('patrols').select('*').order('created_at', { ascending: false }).limit(15)
    ]);

    notices = noticesRes.data || [];
    moderationLogs = moderationRes.data || [];
    patrols = patrolsRes.data || [];

    if (userSearchQuery) {
      const { data: whitelists } = await supabase
        .from('user_whitelists')
        .select('*')
        .or(`discord_id.ilike.%${userSearchQuery}%,rp_name.ilike.%${userSearchQuery}%,forename.ilike.%${userSearchQuery}%,surname.ilike.%${userSearchQuery}%,email.ilike.%${userSearchQuery}%`)
        .limit(10);

      searchedUsers = whitelists || [];

      if (searchedUsers.length === 1) {
        const target = searchedUsers[0];
        const discordInfo = await fetchDiscordMemberInfo(target.discord_id);
        const { data: userLogs } = await supabase
          .from('moderation_logs')
          .select('*')
          .eq('discord_id', target.discord_id)
          .order('created_at', { ascending: false });

        selectedUserDossier = {
          ...target,
          discord: discordInfo,
          moderation: userLogs || []
        };
      }
    }
  } catch (err) {
    console.error('Management page query error:', err);
  }

  return (
    <div className="flex flex-col px-8 mt-4 max-w-[1450px] mx-auto w-full gap-6 pb-16">
      
      {/* Header Banner */}
      <div className="w-full bg-neutral-900 border border-neutral-800 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-red-600" />
        <h2 className="text-2xl font-bold tracking-tight text-neutral-100 font-mono uppercase">
          Command & Management Portal
        </h2>
        <p className="text-xs text-neutral-400 mt-1 font-mono">
          Full administrative access: User Dossier Lookup, Patrol Dispatch, Broadcast Notices, and Moderation Logs.
        </p>
      </div>

      {/* SECTION 1: USER DOSSIER & REGISTRY LOOKUP */}
      <div className="bg-neutral-900 border border-neutral-800 p-6 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-neutral-800">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-100 font-mono">
              👤 Operator Dossier & Whitelist Registry Lookup
            </h3>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">
              Search by Discord ID, Forename, Surname, RP Name, or Email to inspect complete records and live roles.
            </p>
          </div>

          <form method="GET" className="flex gap-2 w-full md:w-auto">
            <input 
              type="text" 
              name="userQuery" 
              defaultValue={userSearchQuery}
              placeholder="Search operator..." 
              className="bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-none focus:border-red-500 w-full md:w-72"
            />
            <button 
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold uppercase font-mono transition-colors shrink-0 cursor-pointer"
            >
              Lookup
            </button>
          </form>
        </div>

        {selectedUserDossier ? (
          <div className="bg-neutral-950 border border-neutral-800 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Operator Card */}
            <div className="flex flex-col items-center text-center border-b lg:border-b-0 lg:border-r border-neutral-800 pb-6 lg:pb-0 lg:pr-6">
              <img 
                src={selectedUserDossier.discord?.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'} 
                alt="Avatar" 
                className="w-20 h-20 rounded-full border-2 border-neutral-700 mb-3 shadow-lg object-cover"
              />
              <h4 className="text-sm font-bold text-neutral-100 uppercase tracking-wide">
                {selectedUserDossier.rp_name || `${selectedUserDossier.forename} ${selectedUserDossier.surname}`}
              </h4>
              <p className="text-xs font-mono text-neutral-500 mb-1">Collar: #{selectedUserDossier.collar_number}</p>
              <p className="text-[11px] font-mono text-[#5865F2] mb-4">@{selectedUserDossier.discord?.username || 'Unknown'}</p>

              <div className="w-full text-left font-mono text-xs space-y-2 pt-3 border-t border-neutral-800">
                <div className="flex justify-between"><span className="text-neutral-500">Discord ID:</span> <span className="text-neutral-300">{selectedUserDossier.discord_id}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Server Join:</span> <span className="text-neutral-300">{selectedUserDossier.discord?.joinedAt ? new Date(selectedUserDossier.discord.joinedAt).toLocaleDateString() : 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Email:</span> <span className="text-neutral-300 truncate max-w-[180px]">{selectedUserDossier.email}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">DOB:</span> <span className="text-neutral-300">{selectedUserDossier.dob}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Referral:</span> <span className="text-neutral-300">{selectedUserDossier.referral_source || 'N/A'}</span></div>
              </div>
            </div>

            {/* Live Discord Roles */}
            <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-neutral-800 pb-6 lg:pb-0 lg:pr-6">
              <h5 className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-3 pb-2 border-b border-neutral-800">
                Live Server Roles ({selectedUserDossier.discord?.roles?.length || 0})
              </h5>
              <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto pr-1">
                {selectedUserDossier.discord?.roles?.length > 0 ? (
                  selectedUserDossier.discord.roles.map((role: any) => (
                    <span 
                      key={role.id}
                      className="px-2 py-1 bg-neutral-900 border text-[11px] font-mono rounded-sm flex items-center gap-1.5"
                      style={{ borderColor: `${role.color}40`, color: role.color }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: role.color }} />
                      @{role.name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-neutral-500 italic font-mono">No roles retrieved or user not in guild.</span>
                )}
              </div>
            </div>

            {/* User Moderation History */}
            <div className="flex flex-col">
              <h5 className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-3 pb-2 border-b border-neutral-800">
                Operator Infraction History ({selectedUserDossier.moderation.length})
              </h5>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {selectedUserDossier.moderation.length > 0 ? (
                  selectedUserDossier.moderation.map((log: any) => (
                    <div key={log.id} className="bg-neutral-900 border border-neutral-800 p-2.5 text-xs font-mono">
                      <div className="flex justify-between items-center mb-1">
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold ${log.action_type === 'BAN' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {log.action_type}
                        </span>
                        <span className="text-[10px] text-neutral-500">{new Date(log.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-neutral-300 text-[11px]">{log.reason}</p>
                      <span className="text-[10px] text-neutral-500 block mt-1">By: {log.moderator_name}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-neutral-500 italic font-mono">Clean record. No infractions logged.</span>
                )}
              </div>
            </div>

          </div>
        ) : searchedUsers.length > 1 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {searchedUsers.map((u) => (
              <a 
                key={u.discord_id}
                href={`/dashboard/management?userQuery=${u.discord_id}`}
                className="bg-neutral-950 border border-neutral-800 hover:border-red-600/60 p-4 transition-colors block font-mono"
              >
                <div className="text-xs font-bold text-neutral-200">{u.rp_name || `${u.forename} ${u.surname}`}</div>
                <div className="text-[11px] text-neutral-400 mt-1">Collar: #{u.collar_number}</div>
                <div className="text-[10px] text-neutral-500 mt-2 truncate">ID: {u.discord_id}</div>
              </a>
            ))}
          </div>
        ) : userSearchQuery ? (
          <p className="text-xs text-neutral-500 italic font-mono py-4 text-center">No registered operators found matching "{userSearchQuery}".</p>
        ) : (
          <p className="text-xs text-neutral-500 italic font-mono py-4 text-center">Enter a search term above to lookup operator records.</p>
        )}
      </div>

      {/* SECTION 2: PATROL SHIFT MANAGEMENT */}
      <div className="bg-neutral-900 border border-neutral-800 p-6 shadow-lg">
        <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-100 mb-4 pb-2 border-b border-neutral-800 font-mono">
          🚓 Active Patrol Dispatch & Management
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Create Patrol Form */}
          <div className="bg-neutral-950 border border-neutral-800 p-5">
            <h4 className="text-xs font-mono font-bold text-neutral-200 uppercase tracking-wider mb-3">Schedule New Shift</h4>
            <form action={createManagementPatrol} className="space-y-3 font-mono">
              <input type="hidden" name="creator" value={currentModName} />
              <div>
                <label className="block text-[10px] uppercase text-neutral-400 mb-1">Shift Title</label>
                <input type="text" name="title" required placeholder="e.g. Metropolitan Joint Patrol" className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-red-500" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase text-neutral-400 mb-1">Division</label>
                  <input type="text" name="division" required placeholder="e.g. MET Police" className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-neutral-400 mb-1">Shift Lead</label>
                  <input type="text" name="lead" placeholder="e.g. Insp. Harrison" className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-red-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase text-neutral-400 mb-1">Date</label>
                  <input type="text" name="date" placeholder="e.g. Friday, Oct 2" className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-neutral-400 mb-1">Time</label>
                  <input type="text" name="time" placeholder="e.g. 20:00 BST" className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-red-500" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase text-neutral-400 mb-1">Briefing Description</label>
                <textarea name="description" rows={2} placeholder="Briefing guidelines..." className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-red-500 resize-none" />
              </div>
              <button type="submit" className="w-full py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer">
                Publish & Dispatch Patrol
              </button>
            </form>
          </div>

          {/* Active Patrols List with Delete Option */}
          <div className="lg:col-span-2 bg-neutral-950 border border-neutral-800 p-5">
            <h4 className="text-xs font-mono font-bold text-neutral-200 uppercase tracking-wider mb-3">Active Patrol Shifts ({patrols.length})</h4>
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {patrols.length > 0 ? (
                patrols.map((p) => (
                  <div key={p.id} className="bg-neutral-900 border border-neutral-800 p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 font-mono">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-neutral-400">{p.id}</span>
                        <span className="text-xs font-bold text-neutral-100">{p.title}</span>
                        <span className="text-[10px] text-[#5865F2] uppercase">({p.division})</span>
                      </div>
                      <div className="text-[11px] text-neutral-400">Lead: {p.lead} | Date: {p.date} ({p.time})</div>
                      <div className="text-[10px] text-emerald-400 mt-1">Booked On: {p.attending?.length || 0} | Absent: {p.unattending?.length || 0}</div>
                    </div>
                    <form action={deletePatrol}>
                      <input type="hidden" name="patrolId" value={p.id} />
                      <input type="hidden" name="messageId" value={p.discord_message_id} />
                      <button type="submit" className="px-3 py-1.5 bg-red-950 hover:bg-red-900 border border-red-800 text-red-400 text-[11px] uppercase tracking-wider transition-colors cursor-pointer">
                        Delete Shift
                      </button>
                    </form>
                  </div>
                ))
              ) : (
                <p className="text-xs text-neutral-500 italic font-mono py-8 text-center">No active patrol deployments found.</p>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* SECTION 3 & 4: NOTICES & MODERATION LOGGING */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Community Notices */}
        <div className="bg-neutral-900 border border-neutral-800 p-6 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-200 mb-4 pb-2 border-b border-neutral-800 font-mono">
              📢 Publish Community Notice
            </h3>
            <form action={postNotice} className="space-y-4 font-mono">
              <input type="hidden" name="author" value={currentModName} />
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-neutral-400 mb-1">Notice Title</label>
                <input type="text" name="title" required placeholder="e.g. Mandatory Briefing" className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-red-500" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-neutral-400 mb-1">Content / Body</label>
                <textarea name="content" rows={3} required placeholder="Enter notice details..." className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-red-500 resize-none" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer">
                Broadcast Notice
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-800">
            <h4 className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest mb-3">Recent Live Notices ({notices.length})</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {notices.map((n) => (
                <div key={n.id} className="bg-neutral-950 border border-neutral-800 p-2.5 font-mono">
                  <div className="flex justify-between items-center mb-1"><span className="text-xs font-bold text-neutral-200">{n.title}</span><span className="text-[10px] text-neutral-500">{new Date(n.created_at).toLocaleDateString()}</span></div>
                  <p className="text-xs text-neutral-400 line-clamp-1">{n.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Issue Moderation Action */}
        <div className="bg-neutral-900 border border-neutral-800 p-6 shadow-lg">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-200 mb-4 pb-2 border-b border-neutral-800 font-mono">
            ⚖️ Issue Moderation Action
          </h3>
          <form action={issueModeration} className="space-y-4 font-mono">
            <input type="hidden" name="moderator" value={currentModName} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-neutral-400 mb-1">Target Discord ID</label>
                <input type="text" name="discordId" required placeholder="e.g. 126868..." className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-red-500" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-neutral-400 mb-1">Username / Handle</label>
                <input type="text" name="username" placeholder="e.g. J.Costin" className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-red-500" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-neutral-400 mb-1">Action Type</label>
              <select name="actionType" className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-red-500 cursor-pointer">
                <option value="WARN">WARNING</option>
                <option value="BAN">BAN / SUSPENSION</option>
                <option value="NOTE">STAFF NOTE</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-neutral-400 mb-1">Reason / Details</label>
              <textarea name="reason" rows={3} required placeholder="Infraction details..." className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-red-500 resize-none" />
            </div>
            <button type="submit" className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer">
              Log Moderation Action
            </button>
          </form>
        </div>

      </div>

      {/* SECTION 5: GLOBAL MODERATION REGISTRY */}
      <div className="bg-neutral-900 border border-neutral-800 p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-3 border-b border-neutral-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-200 font-mono">
            🔍 Global Moderation History & Ban Registry
          </h3>
          <form method="GET" className="flex gap-2 w-full sm:w-auto">
            <input type="text" name="search" defaultValue={modSearchQuery} placeholder="Search logs by ID or Name..." className="bg-neutral-950 border border-neutral-800 px-3 py-1.5 text-xs text-neutral-200 font-mono focus:outline-none focus:border-red-500 w-full sm:w-64" />
            <button type="submit" className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold uppercase font-mono transition-colors">Filter</button>
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
                    <td className="py-3 px-3 text-neutral-500 whitespace-nowrap">{new Date(log.created_at).toLocaleString('en-GB')}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-sm ${log.action_type === 'BAN' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : log.action_type === 'WARN' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
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
                  <td colSpan={6} className="py-6 text-center text-neutral-500 italic">No moderation records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}