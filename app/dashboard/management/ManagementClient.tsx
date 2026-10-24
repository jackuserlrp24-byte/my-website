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
    editNotice: (formData: FormData) => Promise<void>;
    deleteNotice: (formData: FormData) => Promise<void>;
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
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // States for Live Notices interactivity
  const [expandedNotices, setExpandedNotices] = useState<Record<string, boolean>>({});
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);

  const toggleExpandNotice = (id: string) => {
    setExpandedNotices((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    allUsers.length > 0 ? allUsers[0].discord_id : null
  );

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const filteredUsers = allUsers.filter((u) => {
    const q = userSearchText.toLowerCase();
    const name = `${u.forename || ''} ${u.surname || ''}`.toLowerCase();
    const rpName = (u.rp_name || '').toLowerCase();
    const discordId = (u.discord_id || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const collar = String(u.collar_number || '');

    return name.includes(q) || rpName.includes(q) || discordId.includes(q) || email.includes(q) || collar.includes(q);
  });

  const selectedUser = allUsers.find((u) => u.discord_id === selectedUserId);

  const copyAllUserDetails = () => {
    if (!selectedUser) return;
    const summary = `
=== OPERATOR DOSSIER ===
RP Name: ${selectedUser.rp_name || `${selectedUser.forename} ${selectedUser.surname}`}
Collar Number: #${selectedUser.collar_number || 'N/A'}
Discord ID: ${selectedUser.discord_id}
Discord Tag: @${selectedUser.discord?.username || 'Unknown'}
Email: ${selectedUser.email || 'N/A'}
DOB: ${selectedUser.dob || 'N/A'}
Referral: ${selectedUser.referral_source || 'N/A'}
Hours Played: ${selectedUser.hours_played || 'N/A'}
Microphone: ${selectedUser.has_mic ? 'Yes' : 'No'}
Rules Agreed: ${selectedUser.agreed_rules ? 'Yes' : 'No'}
Experience: ${selectedUser.rp_experience || 'None specified'}
Submitted At: ${selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString('en-GB') : 'N/A'}
========================
    `.trim();

    navigator.clipboard.writeText(summary);
    setCopiedField('ALL_DOSSIER');
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="flex flex-col px-8 mt-4 max-w-[1450px] mx-auto w-full gap-6 pb-16 select-none font-mono antialiased">
      
      {/* Header Banner */}
      <div className="w-full bg-neutral-900 border border-neutral-800 p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#5865F2]" />
        <div>
          <span className="text-[10px] text-[#5865F2] tracking-widest uppercase block mb-1">
            Administration & Overview
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-100">
            Management Panel
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
          className={`px-5 py-2.5 text-xs font-semibold tracking-wider transition-colors cursor-pointer border shrink-0 ${
            activeTab === 'dossiers'
              ? 'bg-[#5865F2] border-[#5865F2] text-white shadow-md'
              : 'bg-neutral-950/60 hover:bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
          }`}
        >
          User Search
        </button>

        <button
          onClick={() => setActiveTab('patrols')}
          className={`px-5 py-2.5 text-xs font-semibold tracking-wider transition-colors cursor-pointer border shrink-0 ${
            activeTab === 'patrols'
              ? 'bg-[#5865F2] border-[#5865F2] text-white shadow-md'
              : 'bg-neutral-950/60 hover:bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Manage Events ({patrols.length})
        </button>

        <button
          onClick={() => setActiveTab('notices')}
          className={`px-5 py-2.5 text-xs font-semibold tracking-wider transition-colors cursor-pointer border shrink-0 ${
            activeTab === 'notices'
              ? 'bg-[#5865F2] border-[#5865F2] text-white shadow-md'
              : 'bg-neutral-950/60 hover:bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Notices & Moderation
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-5 py-2.5 text-xs font-semibold tracking-wider transition-colors cursor-pointer border shrink-0 ${
            activeTab === 'logs'
              ? 'bg-[#5865F2] border-[#5865F2] text-white shadow-md'
              : 'bg-neutral-950/60 hover:bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Global Moderation Data
        </button>
      </div>

      {/* TAB 1: USER SEARCH & DETAILED DOSSIER */}
      {activeTab === 'dossiers' && (
        <div className="bg-neutral-900 border border-neutral-800 p-6 shadow-lg flex flex-col gap-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
            <div>
              <h3 className="text-sm font-bold tracking-wider text-neutral-100">
                User Search & Complete Application Dossier
              </h3>
              <p className="text-xs text-neutral-400 font-sans mt-0.5">
                Select an operator from the dropdown or search to inspect all submitted whitelist responses and live Discord details.
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
            <div className="flex flex-col gap-6">
              
              {/* Header Action Row */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-neutral-950 border border-neutral-800 p-4">
                <div className="flex items-center gap-4">
                  <img 
                    src={selectedUser.discord?.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'} 
                    alt="Avatar" 
                    className="w-14 h-14 rounded-full border border-neutral-700 object-cover shadow-md"
                  />
                  <div>
                    <h4 className="text-base font-bold text-neutral-100">
                      {selectedUser.rp_name || `${selectedUser.forename} ${selectedUser.surname}`}
                    </h4>
                    <span className="text-xs text-[#5865F2]">@{selectedUser.discord?.username || 'Unknown'}</span>
                    <span className="text-xs text-neutral-500 ml-3">Collar: #{selectedUser.collar_number || '000'}</span>
                  </div>
                </div>

                <button
                  onClick={copyAllUserDetails}
                  className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold tracking-wider transition-colors cursor-pointer border border-[#5865F2]/50"
                >
                  {copiedField === 'ALL_DOSSIER' ? '✓ Dossier Copied' : 'Copy Full Dossier'}
                </button>
              </div>

              {/* Grid 1: Whitelist Application Details */}
              <div className="bg-neutral-950 border border-neutral-800 p-6 flex flex-col gap-4">
                <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider pb-2 border-b border-neutral-800 flex items-center justify-between">
                  <span>Whitelist Application Answers</span>
                  <span className="text-[10px] text-neutral-500 font-normal">Submitted: {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString('en-GB') : 'N/A'}</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  
                  <div className="bg-neutral-900 border border-neutral-800 p-3 flex justify-between items-center">
                    <div>
                      <span className="block text-[10px] text-neutral-500 uppercase">Forename</span>
                      <span className="text-neutral-200 font-semibold">{selectedUser.forename || 'N/A'}</span>
                    </div>
                    <button onClick={() => handleCopy(selectedUser.forename, 'forename')} className="px-2 py-1 bg-neutral-950 border border-neutral-800 text-[10px] text-neutral-400 hover:text-white transition-colors cursor-pointer">
                      {copiedField === 'forename' ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  <div className="bg-neutral-900 border border-neutral-800 p-3 flex justify-between items-center">
                    <div>
                      <span className="block text-[10px] text-neutral-500 uppercase">Surname</span>
                      <span className="text-neutral-200 font-semibold">{selectedUser.surname || 'N/A'}</span>
                    </div>
                    <button onClick={() => handleCopy(selectedUser.surname, 'surname')} className="px-2 py-1 bg-neutral-950 border border-neutral-800 text-[10px] text-neutral-400 hover:text-white transition-colors cursor-pointer">
                      {copiedField === 'surname' ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  <div className="bg-neutral-900 border border-neutral-800 p-3 flex justify-between items-center">
                    <div className="truncate pr-2">
                      <span className="block text-[10px] text-neutral-500 uppercase">Email Address</span>
                      <span className="text-neutral-200 font-semibold truncate block max-w-[180px]">{selectedUser.email || 'N/A'}</span>
                    </div>
                    <button onClick={() => handleCopy(selectedUser.email, 'email')} className="px-2 py-1 bg-neutral-950 border border-neutral-800 text-[10px] text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0">
                      {copiedField === 'email' ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  <div className="bg-neutral-900 border border-neutral-800 p-3 flex justify-between items-center">
                    <div>
                      <span className="block text-[10px] text-neutral-500 uppercase">Collar Number</span>
                      <span className="text-neutral-200 font-semibold">#{selectedUser.collar_number || 'N/A'}</span>
                    </div>
                    <button onClick={() => handleCopy(String(selectedUser.collar_number), 'collar')} className="px-2 py-1 bg-neutral-950 border border-neutral-800 text-[10px] text-neutral-400 hover:text-white transition-colors cursor-pointer">
                      {copiedField === 'collar' ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  <div className="bg-neutral-900 border border-neutral-800 p-3 flex justify-between items-center">
                    <div>
                      <span className="block text-[10px] text-neutral-500 uppercase">Date of Birth</span>
                      <span className="text-neutral-200 font-semibold">{selectedUser.dob || 'N/A'}</span>
                    </div>
                    <button onClick={() => handleCopy(selectedUser.dob, 'dob')} className="px-2 py-1 bg-neutral-950 border border-neutral-800 text-[10px] text-neutral-400 hover:text-white transition-colors cursor-pointer">
                      {copiedField === 'dob' ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  <div className="bg-neutral-900 border border-neutral-800 p-3 flex justify-between items-center">
                    <div>
                      <span className="block text-[10px] text-neutral-500 uppercase">FiveM Hours</span>
                      <span className="text-neutral-200 font-semibold">{selectedUser.hours_played || 'N/A'}</span>
                    </div>
                    <button onClick={() => handleCopy(selectedUser.hours_played, 'hours')} className="px-2 py-1 bg-neutral-950 border border-neutral-800 text-[10px] text-neutral-400 hover:text-white transition-colors cursor-pointer">
                      {copiedField === 'hours' ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  <div className="bg-neutral-900 border border-neutral-800 p-3 flex justify-between items-center">
                    <div>
                      <span className="block text-[10px] text-neutral-500 uppercase">Referral Source</span>
                      <span className="text-neutral-200 font-semibold">{selectedUser.referral_source || 'N/A'}</span>
                    </div>
                    <button onClick={() => handleCopy(selectedUser.referral_source, 'referral')} className="px-2 py-1 bg-neutral-950 border border-neutral-800 text-[10px] text-neutral-400 hover:text-white transition-colors cursor-pointer">
                      {copiedField === 'referral' ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  <div className="bg-neutral-900 border border-neutral-800 p-3 flex justify-between items-center">
                    <div>
                      <span className="block text-[10px] text-neutral-500 uppercase">Working Microphone</span>
                      <span className="text-neutral-200 font-semibold">{selectedUser.has_mic ? 'Yes' : 'No'}</span>
                    </div>
                  </div>

                  <div className="bg-neutral-900 border border-neutral-800 p-3 flex justify-between items-center">
                    <div>
                      <span className="block text-[10px] text-neutral-500 uppercase">Agreed to Rules</span>
                      <span className="text-neutral-200 font-semibold">{selectedUser.agreed_rules ? 'Yes' : 'No'}</span>
                    </div>
                  </div>

                </div>

                <div className="bg-neutral-900 border border-neutral-800 p-4 mt-2">
                  <span className="block text-[10px] text-neutral-500 uppercase mb-1">Roleplay Experience / Background Statement</span>
                  <p className="text-xs text-neutral-300 font-sans leading-relaxed">
                    {selectedUser.rp_experience || 'No previous experience description submitted.'}
                  </p>
                </div>
              </div>

              {/* Grid 2: Discord Account & Guild Roles */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                <div className="bg-neutral-950 border border-neutral-800 p-6 flex flex-col justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider pb-2 border-b border-neutral-800 mb-4">
                      Discord Account Details
                    </h4>
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center pb-2 border-b border-neutral-900">
                        <span className="text-neutral-500">Discord ID</span>
                        <div className="flex items-center gap-2">
                          <span className="text-neutral-200">{selectedUser.discord_id}</span>
                          <button onClick={() => handleCopy(selectedUser.discord_id, 'discord_id')} className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-400 hover:text-white transition-colors cursor-pointer">
                            {copiedField === 'discord_id' ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pb-2 border-b border-neutral-900">
                        <span className="text-neutral-500">Username</span>
                        <span className="text-neutral-200">@{selectedUser.discord?.username || 'Unknown'}</span>
                      </div>

                      <div className="flex justify-between items-center pb-2 border-b border-neutral-900">
                        <span className="text-neutral-500">Guild Nickname</span>
                        <span className="text-neutral-200">{selectedUser.discord?.nickname || 'None'}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-neutral-500">Server Join Date</span>
                        <span className="text-neutral-200">{selectedUser.discord?.joinedAt ? new Date(selectedUser.discord.joinedAt).toLocaleString('en-GB') : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-neutral-950 border border-neutral-800 p-6 flex flex-col justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider pb-2 border-b border-neutral-800 mb-4">
                      Active Guild Roles ({selectedUser.discord?.roles?.length || 0})
                    </h4>
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {selectedUser.discord?.roles?.length > 0 ? (
                        selectedUser.discord.roles.map((role: any) => (
                          <span 
                            key={role.id}
                            className="px-2.5 py-1 bg-neutral-900 border text-[11px] rounded-sm flex items-center gap-1.5"
                            style={{ borderColor: `${role.color}40`, color: role.color }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: role.color }} />
                            @{role.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-neutral-500 italic font-sans">No live roles retrieved from Discord.</span>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Grid 3: Individual Moderation Records */}
              <div className="bg-neutral-950 border border-neutral-800 p-6 flex flex-col gap-4">
                <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider pb-2 border-b border-neutral-800">
                  Individual Moderation History ({selectedUser.moderation?.length || 0})
                </h4>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedUser.moderation?.length > 0 ? (
                    selectedUser.moderation.map((log: any) => (
                      <div key={log.id} className="bg-neutral-900 border border-neutral-800 p-3 text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className={`px-2 py-0.5 text-[9px] font-bold ${log.action_type === 'BAN' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                            {log.action_type}
                          </span>
                          <span className="text-[10px] text-neutral-500">{new Date(log.created_at).toLocaleString('en-GB')}</span>
                        </div>
                        <p className="text-neutral-300 text-xs font-sans mt-1">{log.reason}</p>
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

      {/* TAB 2: MANAGE EVENTS */}
      {activeTab === 'patrols' && (
        <div className="bg-neutral-900 border border-neutral-800 p-6 shadow-lg flex flex-col gap-6">
          <h3 className="text-sm font-bold tracking-wider text-neutral-100 pb-3 border-b border-neutral-800">
            Manage Events & Shift Dispatch
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="bg-neutral-950 border border-neutral-800 p-5">
              <h4 className="text-xs font-bold text-neutral-200 tracking-wider mb-3">Schedule Shift</h4>
              <form action={actions.createManagementPatrol} className="space-y-3">
                <input type="hidden" name="creator" value={currentModName} />
                <div>
                  <label className="block text-[10px] text-neutral-400 mb-1">Shift Title</label>
                  <input type="text" name="title" required placeholder="e.g. MET Police Joint Patrol" className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2]" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1">Division</label>
                    <input type="text" name="division" required placeholder="e.g. MET Police" className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2]" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1">Shift Lead</label>
                    <input type="text" name="lead" placeholder="e.g. Insp. Harrison" className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1">Date</label>
                    <input type="text" name="date" placeholder="e.g. Friday, Oct 2" className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2]" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1">Time</label>
                    <input type="text" name="time" placeholder="e.g. 20:00 BST" className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2]" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-neutral-400 mb-1">Briefing Description</label>
                  <textarea name="description" rows={2} placeholder="Briefing guidelines..." className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2] resize-none" />
                </div>
                <button type="submit" className="w-full py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold tracking-wider transition-colors cursor-pointer">
                  Publish & Dispatch Shift
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-neutral-950 border border-neutral-800 p-5">
              <h4 className="text-xs font-bold text-neutral-200 tracking-wider mb-3">Active Events ({patrols.length})</h4>
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
                        <button type="submit" className="px-3 py-1.5 bg-neutral-800 hover:bg-red-950 border border-neutral-700 hover:border-red-800 text-neutral-300 hover:text-red-400 text-[11px] tracking-wider transition-colors cursor-pointer">
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
          
          {/* Post Notice & Live Management List */}
          <div className="bg-neutral-900 border border-neutral-800 p-6 shadow-lg flex flex-col justify-between gap-6">
            <div>
              <h3 className="text-xs font-semibold tracking-wider text-neutral-200 mb-4 pb-2 border-b border-neutral-800">
                Publish Community Notice
              </h3>
              <form action={actions.postNotice} className="space-y-4">
                <input type="hidden" name="author" value={currentModName} />
                <div>
                  <label className="block text-[11px] tracking-wider text-neutral-400 mb-1">Notice Title</label>
                  <input type="text" name="title" required placeholder="e.g. Mandatory Briefing" className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2]" />
                </div>
                <div>
                  <label className="block text-[11px] tracking-wider text-neutral-400 mb-1">Content / Body</label>
                  <textarea name="content" rows={3} required placeholder="Enter notice details..." className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2] resize-none" />
                </div>
                <button type="submit" className="w-full py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold tracking-wider transition-colors cursor-pointer">
                  Broadcast Notice
                </button>
              </form>
            </div>

            {/* Live Notices Manager with Expand, Edit, Delete */}
            <div className="pt-4 border-t border-neutral-800">
              <h4 className="text-[11px] text-neutral-400 uppercase tracking-widest mb-3">Live Notices ({notices.length})</h4>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {notices.length > 0 ? (
                  notices.map((n) => (
                    <div key={n.id} className="bg-neutral-950 border border-neutral-800 p-3 text-xs">
                      
                      {editingNoticeId === n.id ? (
                        /* Inline Edit Form */
                        <form action={actions.editNotice} onSubmit={() => setEditingNoticeId(null)} className="space-y-2">
                          <input type="hidden" name="noticeId" value={n.id} />
                          <input type="text" name="title" defaultValue={n.title} required className="w-full bg-neutral-900 border border-neutral-700 px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2]" />
                          <textarea name="content" defaultValue={n.content} rows={2} required className="w-full bg-neutral-900 border border-neutral-700 px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2] resize-none" />
                          <div className="flex gap-2 justify-end">
                            <button type="button" onClick={() => setEditingNoticeId(null)} className="px-2.5 py-1 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 text-[10px] uppercase">Cancel</button>
                            <button type="submit" className="px-2.5 py-1 bg-[#5865F2] text-white hover:bg-[#4752C4] text-[10px] uppercase font-semibold">Save Changes</button>
                          </div>
                        </form>
                      ) : (
                        /* Standard Row View */
                        <div>
                          <div className="flex justify-between items-center gap-2">
                            <div className="flex items-center gap-2 truncate">
                              {/* Expand Arrow Button */}
                              <button 
                                onClick={() => toggleExpandNotice(n.id)} 
                                className="w-5 h-5 flex items-center justify-center bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-transform cursor-pointer shrink-0"
                                title="Toggle details"
                              >
                                <span className={`transform transition-transform text-[10px] ${expandedNotices[n.id] ? 'rotate-90' : ''}`}>▶</span>
                              </button>
                              <span className="font-bold text-neutral-200 truncate">{n.title}</span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-neutral-500 mr-2">{new Date(n.created_at).toLocaleDateString()}</span>
                              
                              {/* Edit Button */}
                              <button 
                                onClick={() => setEditingNoticeId(n.id)}
                                className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-[10px] uppercase transition-colors cursor-pointer"
                              >
                                Edit
                              </button>

                              {/* Delete Button */}
                              <form action={actions.deleteNotice}>
                                <input type="hidden" name="noticeId" value={n.id} />
                                <button type="submit" className="px-2 py-1 bg-neutral-900 hover:bg-red-950 border border-neutral-800 hover:border-red-900 text-neutral-400 hover:text-red-400 text-[10px] uppercase transition-colors cursor-pointer">
                                  Delete
                                </button>
                              </form>
                            </div>
                          </div>

                          {/* Expandable Text Body */}
                          {expandedNotices[n.id] && (
                            <div className="mt-3 pt-3 border-t border-neutral-900 text-neutral-300 font-sans leading-relaxed text-xs">
                              <p className="whitespace-pre-wrap">{n.content}</p>
                              <span className="text-[10px] text-neutral-500 font-mono block mt-2">Author: {n.author_name || 'Management'}</span>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  ))
                ) : (
                  <p className="text-xs text-neutral-500 italic font-sans py-4 text-center">No active live notices found.</p>
                )}
              </div>
            </div>
          </div>

          {/* Issue Moderation */}
          <div className="bg-neutral-900 border border-neutral-800 p-6 shadow-lg">
            <h3 className="text-xs font-semibold tracking-wider text-neutral-200 mb-4 pb-2 border-b border-neutral-800">
              Issue Moderation Action
            </h3>
            <form action={actions.issueModeration} className="space-y-4">
              <input type="hidden" name="moderator" value={currentModName} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] tracking-wider text-neutral-400 mb-1">Target Discord ID</label>
                  <input type="text" name="discordId" required placeholder="e.g. 126868..." className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2]" />
                </div>
                <div>
                  <label className="block text-[11px] tracking-wider text-neutral-400 mb-1">Username / Handle</label>
                  <input type="text" name="username" placeholder="e.g. J.Costin" className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2]" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] tracking-wider text-neutral-400 mb-1">Action Type</label>
                <select name="actionType" className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2] cursor-pointer">
                  <option value="WARN">WARNING</option>
                  <option value="BAN">BAN / SUSPENSION</option>
                  <option value="NOTE">STAFF NOTE</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] tracking-wider text-neutral-400 mb-1">Reason / Details</label>
                <textarea name="reason" rows={3} required placeholder="Infraction details..." className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2] resize-none" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold tracking-wider transition-colors cursor-pointer">
                Log Moderation Action
              </button>
            </form>
          </div>

        </div>
      )}

      {/* TAB 4: GLOBAL MODERATION DATA */}
      {activeTab === 'logs' && (
        <div className="bg-neutral-900 border border-neutral-800 p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-3 border-b border-neutral-800">
            <h3 className="text-xs font-semibold tracking-wider text-neutral-200">
              Global Moderation Data
            </h3>
            <form method="GET" className="flex gap-2 w-full sm:w-auto">
              <input type="text" name="search" defaultValue={modSearchQuery} placeholder="Search logs..." className="bg-neutral-950 border border-neutral-800 px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2] w-full sm:w-64" />
              <button type="submit" className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold transition-colors">Filter</button>
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400 text-[10px] tracking-wider">
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