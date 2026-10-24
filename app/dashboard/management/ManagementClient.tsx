'use client';

import { useState } from 'react';

interface Props {
  currentModName: string;
  allUsers: any[];
  notices: any[];
  moderationLogs: any[];
  patrols: any[];
  modSearchQuery: string;
  actions: {
    postNotice: (formData: FormData) => Promise<void>;
    issueModeration: (formData: FormData) => Promise<void>;
    createManagementPatrol: (formData: FormData) => Promise<void>;
    deletePatrol: (formData: FormData) => Promise<void>;
  };
}

export default function ManagementClient({
  currentModName,
  allUsers,
  notices,
  moderationLogs,
  patrols,
  modSearchQuery,
  actions
}: Props) {
  const [activeTab, setActiveTab] = useState<'dossiers' | 'patrols' | 'notices' | 'logs'>('dossiers');
  const [userSearchText, setUserSearchText] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    allUsers.length > 0 ? allUsers[0].discord_id : null
  );

  const filteredUsers = allUsers.filter((u) => {
    const q = userSearchText.toLowerCase();
    const name = `${u.forename} ${u.surname}`.toLowerCase();
    const rpName = (u.rp_name || '').toLowerCase();
    const discordId = (u.discord_id || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const collar = String(u.collar_number || '');

    return name.includes(q) || rpName.includes(q) || discordId.includes(q) || email.includes(q) || collar.includes(q);
  });

  const selectedUser = allUsers.find((u) => u.discord_id === selectedUserId);

  return (
    <div className="flex flex-col px-8 mt-4 max-w-[1450px] mx-auto w-full gap-6 pb-16 select-none font-mono antialiased">
      
      {/* Header Banner */}
      <div className="w-full bg-neutral-900 border border-neutral-800 p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#5865F2]" />
        <div>
          <span className="text-[10px] text-[#5865F2] tracking-widest uppercase block mb-1">
            ADMINISTRATION & OVERVIEW
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-100 uppercase">
            Management Center
          </h2>
          <p className="text-xs text-neutral-400 mt-1 font-sans">
            Centralized administration suite for user dossier lookups, shift dispatches, community broadcasts, and moderation history.
          </p>
        </div>
      </div>

      {/* Sub-Menu Tabs */}
      <div className="flex border-b border-neutral-800 bg-neutral-900/50 p-1 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('dossiers')}
          className={`px-5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer border shrink-0 ${
            activeTab === 'dossiers'
              ? 'bg-[#5865F2] border-[#5865F2] text-white shadow-md'
              : 'bg-neutral-950/60 hover:bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Operator Dossiers
        </button>

        <button
          onClick={() => setActiveTab('patrols')}
          className={`px-5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer border shrink-0 ${
            activeTab === 'patrols'
              ? 'bg-[#5865F2] border-[#5865F2] text-white shadow-md'
              : 'bg-neutral-950/60 hover:bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Patrol Dispatch ({patrols.length})
        </button>

        <button
          onClick={() => setActiveTab('notices')}
          className={`px-5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer border shrink-0 ${
            activeTab === 'notices'
              ? 'bg-[#5865F2] border-[#5865F2] text-white shadow-md'
              : 'bg-neutral-950/60 hover:bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Notices & Moderation
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer border shrink-0 ${
            activeTab === 'logs'
              ? 'bg-[#5865F2] border-[#5865F2] text-white shadow-md'
              : 'bg-neutral-950/60 hover:bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Global Infraction Registry
        </button>
      </div>

      {/* TAB 1: OPERATOR DOSSIER LOOKUP */}
      {activeTab === 'dossiers' && (
        <div className="bg-neutral-900 border border-neutral-800 p-6 shadow-lg flex flex-col gap-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-100">
                Operator Registry & Dossier Lookup
              </h3>
              <p className="text-xs text-neutral-400 font-sans mt-0.5">
                Select a registered operator from the dropdown or search by name, collar number, or ID.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <input
                type="text"
                placeholder="Filter operators..."
                value={userSearchText}
                onChange={(e) => setUserSearchText(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2] w-full sm:w-48"
              />
              <select
                value={selectedUserId || ''}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2] cursor-pointer w-full sm:w-64"
              >
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((u) => (
                    <option key={u.discord_id} value={u.discord_id}>
                      [{u.collar_number || '000'}] {u.rp_name || `${u.forename} ${u.surname}`}
                    </option>
                  ))
                ) : (
                  <option value="">No operators found</option>
                )}
              </select>
            </div>
          </div>

          {selectedUser ? (
            <div className="bg-neutral-950 border border-neutral-800 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Profile Card */}
              <div className="flex flex-col items-center text-center border-b lg:border-b-0 lg:border-r border-neutral-800 pb-6 lg:pb-0 lg:pr-6">
                <img 
                  src={selectedUser.discord?.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'} 
                  alt="Avatar" 
                  className="w-20 h-20 rounded-full border border-neutral-700 mb-3 shadow-lg object-cover"
                />
                <h4 className="text-sm font-bold text-neutral-100 uppercase tracking-wide">
                  {selectedUser.rp_name || `${selectedUser.forename} ${selectedUser.surname}`}
                </h4>
                <p className="text-xs text-neutral-500 mb-1">Collar: #{selectedUser.collar_number}</p>
                <p className="text-[11px] text-[#5865F2] mb-4">@{selectedUser.discord?.username || 'Unknown'}</p>

                <div className="w-full text-left text-xs space-y-2 pt-3 border-t border-neutral-800">
                  <div className="flex justify-between"><span className="text-neutral-500">Forename:</span> <span className="text-neutral-300">{selectedUser.forename}</span></div>
                  <div className="flex justify-between"><span className="text-neutral-500">Surname:</span> <span className="text-neutral-300">{selectedUser.surname}</span></div>
                  <div className="flex justify-between"><span className="text-neutral-500">Discord ID:</span> <span className="text-neutral-300">{selectedUser.discord_id}</span></div>
                  <div className="flex justify-between"><span className="text-neutral-500">Email:</span> <span className="text-neutral-300 truncate max-w-[180px]">{selectedUser.email}</span></div>
                  <div className="flex justify-between"><span className="text-neutral-500">DOB:</span> <span className="text-neutral-300">{selectedUser.dob}</span></div>
                  <div className="flex justify-between"><span className="text-neutral-500">Referral:</span> <span className="text-neutral-300">{selectedUser.referral_source || 'N/A'}</span></div>
                </div>
              </div>

              {/* Roles Breakdown */}
              <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-neutral-800 pb-6 lg:pb-0 lg:pr-6">
                <h5 className="text-[11px] uppercase tracking-wider text-neutral-400 mb-3 pb-2 border-b border-neutral-800">
                  Active Guild Roles ({selectedUser.discord?.roles?.length || 0})
                </h5>
                <div className="flex flex-wrap gap-1.5 max-h-64 overflow-y-auto pr-1">
                  {selectedUser.discord?.roles?.length > 0 ? (
                    selectedUser.discord.roles.map((role: any) => (
                      <span 
                        key={role.id}
                        className="px-2 py-1 bg-neutral-900 border text-[11px] rounded-sm flex items-center gap-1.5"
                        style={{ borderColor: `${role.color}40`, color: role.color }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: role.color }} />
                        @{role.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-neutral-500 italic font-sans">No live roles retrieved.</span>
                  )}
                </div>
              </div>

              {/* Moderation Records */}
              <div className="flex flex-col">
                <h5 className="text-[11px] uppercase tracking-wider text-neutral-400 mb-3 pb-2 border-b border-neutral-800">
                  Infraction History ({selectedUser.moderation?.length || 0})
                </h5>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {selectedUser.moderation?.length > 0 ? (
                    selectedUser.moderation.map((log: any) => (
                      <div key={log.id} className="bg-neutral-900 border border-neutral-800 p-2.5 text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className={`px-1.5 py-0.5 text-[9px] font-bold ${log.action_type === 'BAN' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                            {log.action_type}
                          </span>
                          <span className="text-[10px] text-neutral-500">{new Date(log.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-neutral-300 text-[11px] font-sans">{log.reason}</p>
                        <span className="text-[10px] text-neutral-500 block mt-1">Logged by: {log.moderator_name}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-neutral-500 italic font-sans">Clean record. No logged infractions.</span>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="p-12 text-center text-xs text-neutral-500 italic font-sans">
              Select an operator from the dropdown menu above.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PATROL DISPATCH */}
      {activeTab === 'patrols' && (
        <div className="bg-neutral-900 border border-neutral-800 p-6 shadow-lg flex flex-col gap-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-100 pb-3 border-b border-neutral-800">
            Patrol Dispatch & Shift Management
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Create Patrol Form */}
            <div className="bg-neutral-950 border border-neutral-800 p-5">
              <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider mb-3">Schedule Shift</h4>
              <form action={actions.createManagementPatrol} className="space-y-3">
                <input type="hidden" name="creator" value={currentModName} />
                <div>
                  <label className="block text-[10px] uppercase text-neutral-400 mb-1">Shift Title</label>
                  <input type="text" name="title" required placeholder="e.g. MET Police Joint Patrol" className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2]" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase text-neutral-400 mb-1">Division</label>
                    <input type="text" name="division" required placeholder="e.g. MET Police" className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2]" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-neutral-400 mb-1">Shift Lead</label>
                    <input type="text" name="lead" placeholder="e.g. Insp. Harrison" className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase text-neutral-400 mb-1">Date</label>
                    <input type="text" name="date" placeholder="e.g. Friday, Oct 2" className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2]" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-neutral-400 mb-1">Time</label>
                    <input type="text" name="time" placeholder="e.g. 20:00 BST" className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2]" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-neutral-400 mb-1">Briefing Description</label>
                  <textarea name="description" rows={2} placeholder="Briefing guidelines..." className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2] resize-none" />
                </div>
                <button type="submit" className="w-full py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer">
                  Publish & Dispatch Shift
                </button>
              </form>
            </div>

            {/* Active Patrols List */}
            <div className="lg:col-span-2 bg-neutral-950 border border-neutral-800 p-5">
              <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider mb-3">Active Patrols ({patrols.length})</h4>
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {patrols.length > 0 ? (
                  patrols.map((p) => (
                    <div key={p.id} className="bg-neutral-900 border border-neutral-800 p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-neutral-400">{p.id}</span>
                          <span className="text-xs font-bold text-neutral-100">{p.title}</span>
                          <span className="text-[10px] text-[#5865F2] uppercase">({p.division})</span>
                        </div>
                        <div className="text-[11px] text-neutral-400">Lead: {p.lead} | Date: {p.date} ({p.time})</div>
                        <div className="text-[10px] text-emerald-400 mt-1">Booked On: {p.attending?.length || 0} | Absent: {p.unattending?.length || 0}</div>
                      </div>
                      <form action={actions.deletePatrol}>
                        <input type="hidden" name="patrolId" value={p.id} />
                        <input type="hidden" name="messageId" value={p.discord_message_id} />
                        <button type="submit" className="px-3 py-1.5 bg-neutral-800 hover:bg-red-950 border border-neutral-700 hover:border-red-800 text-neutral-300 hover:text-red-400 text-[11px] uppercase tracking-wider transition-colors cursor-pointer">
                          Delete Shift
                        </button>
                      </form>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-neutral-500 italic font-sans py-8 text-center">No active patrol deployments found.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 3: NOTICES & MODERATION FORM */}
      {activeTab === 'notices' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Post Notice */}
          <div className="bg-neutral-900 border border-neutral-800 p-6 shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-200 mb-4 pb-2 border-b border-neutral-800">
                Publish Community Notice
              </h3>
              <form action={actions.postNotice} className="space-y-4">
                <input type="hidden" name="author" value={currentModName} />
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-neutral-400 mb-1">Notice Title</label>
                  <input type="text" name="title" required placeholder="e.g. Mandatory Briefing" className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2]" />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-neutral-400 mb-1">Content / Body</label>
                  <textarea name="content" rows={3} required placeholder="Enter notice details..." className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2] resize-none" />
                </div>
                <button type="submit" className="w-full py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer">
                  Broadcast Notice
                </button>
              </form>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-800">
              <h4 className="text-[11px] text-neutral-400 uppercase tracking-widest mb-3">Live Notices ({notices.length})</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {notices.map((n) => (
                  <div key={n.id} className="bg-neutral-950 border border-neutral-800 p-2.5">
                    <div className="flex justify-between items-center mb-1"><span className="text-xs font-bold text-neutral-200">{n.title}</span><span className="text-[10px] text-neutral-500">{new Date(n.created_at).toLocaleDateString()}</span></div>
                    <p className="text-xs text-neutral-400 line-clamp-1 font-sans">{n.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Issue Moderation */}
          <div className="bg-neutral-900 border border-neutral-800 p-6 shadow-lg">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-200 mb-4 pb-2 border-b border-neutral-800">
              Issue Moderation Action
            </h3>
            <form action={actions.issueModeration} className="space-y-4">
              <input type="hidden" name="moderator" value={currentModName} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-neutral-400 mb-1">Target Discord ID</label>
                  <input type="text" name="discordId" required placeholder="e.g. 126868..." className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2]" />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-neutral-400 mb-1">Username / Handle</label>
                  <input type="text" name="username" placeholder="e.g. J.Costin" className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2]" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-neutral-400 mb-1">Action Type</label>
                <select name="actionType" className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2] cursor-pointer">
                  <option value="WARN">WARNING</option>
                  <option value="BAN">BAN / SUSPENSION</option>
                  <option value="NOTE">STAFF NOTE</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-neutral-400 mb-1">Reason / Details</label>
                <textarea name="reason" rows={3} required placeholder="Infraction details..." className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2] resize-none" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer">
                Log Moderation Action
              </button>
            </form>
          </div>

        </div>
      )}

      {/* TAB 4: GLOBAL INFRACTION REGISTRY */}
      {activeTab === 'logs' && (
        <div className="bg-neutral-900 border border-neutral-800 p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-3 border-b border-neutral-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-200">
              Global Moderation History Registry
            </h3>
            <form method="GET" className="flex gap-2 w-full sm:w-auto">
              <input type="text" name="search" defaultValue={modSearchQuery} placeholder="Search logs..." className="bg-neutral-950 border border-neutral-800 px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2] w-full sm:w-64" />
              <button type="submit" className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold uppercase transition-colors">Filter</button>
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
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
                      <td className="py-3 px-3 max-w-xs truncate text-neutral-300 font-sans" title={log.reason}>{log.reason}</td>
                      <td className="py-3 px-3 text-neutral-400">{log.moderator_name}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-neutral-500 italic font-sans">No moderation records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}