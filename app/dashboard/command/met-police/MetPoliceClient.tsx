'use client';

import { useState } from 'react';

interface Props {
  currentCommandName: string;
  allUsers: any[];
  roleRequests: any[];
  trainingRecords: any[];
  googleDriveLinks: {
    folderUrl: string;
    slidesEmbedUrl: string;
  };
  actions: {
    submitRoleRequest: (formData: FormData) => Promise<void>;
    logTrainingRecord: (formData: FormData) => Promise<void>;
  };
}

export default function MetPoliceClient({
  currentCommandName,
  allUsers,
  roleRequests,
  trainingRecords,
  googleDriveLinks,
  actions
}: Props) {
  const [activeTab, setActiveTab] = useState<'search' | 'roles' | 'training' | 'drive'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    allUsers.length > 0 ? allUsers[0].discord_id : null
  );
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const filteredUsers = allUsers.filter((u) => {
    const q = searchQuery.toLowerCase();
    const name = `${u.forename || ''} ${u.surname || ''}`.toLowerCase();
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
        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600" />
        <div>
          <span className="text-[10px] text-blue-400 tracking-widest uppercase block mb-1">
            Metropolitan Police Command Suite
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-100">
            MET Police Command Portal
          </h2>
          <p className="text-xs text-neutral-400 mt-1 font-sans">
            Authorized for Bronze Commanders and above. Search officer dossiers, request role assignments, audit training logs, and review operational slides.
          </p>
        </div>
      </div>

      {/* Sub-Menu Tabs */}
      <div className="flex border-b border-neutral-800 bg-neutral-900/50 p-1 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('search')}
          className={`px-5 py-2.5 text-xs font-semibold tracking-wider transition-colors cursor-pointer border shrink-0 ${
            activeTab === 'search'
              ? 'bg-blue-600 border-blue-600 text-white shadow-md'
              : 'bg-neutral-950/60 hover:bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Officer Search & Dossiers
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`px-5 py-2.5 text-xs font-semibold tracking-wider transition-colors cursor-pointer border shrink-0 ${
            activeTab === 'roles'
              ? 'bg-blue-600 border-blue-600 text-white shadow-md'
              : 'bg-neutral-950/60 hover:bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Role Adding Requests ({roleRequests.length})
        </button>

        <button
          onClick={() => setActiveTab('training')}
          className={`px-5 py-2.5 text-xs font-semibold tracking-wider transition-colors cursor-pointer border shrink-0 ${
            activeTab === 'training'
              ? 'bg-blue-600 border-blue-600 text-white shadow-md'
              : 'bg-neutral-950/60 hover:bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Training Records & Hosting
        </button>

        <button
          onClick={() => setActiveTab('drive')}
          className={`px-5 py-2.5 text-xs font-semibold tracking-wider transition-colors cursor-pointer border shrink-0 ${
            activeTab === 'drive'
              ? 'bg-blue-600 border-blue-600 text-white shadow-md'
              : 'bg-neutral-950/60 hover:bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Google Drive & Slides
        </button>
      </div>

      {/* TAB 1: OFFICER SEARCH & DOSSIERS */}
      {activeTab === 'search' && (
        <div className="bg-neutral-900 border border-neutral-800 p-6 shadow-lg flex flex-col gap-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
            <div>
              <h3 className="text-sm font-bold tracking-wider text-neutral-100">
                Personnel Database Lookup
              </h3>
              <p className="text-xs text-neutral-400 font-sans mt-0.5">
                Search by officer name, collar number, email, or Discord ID to view complete background records and added roles.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <input
                type="text"
                placeholder="Search personnel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-blue-500 w-full sm:w-48"
              />
              <select
                value={selectedUserId || ''}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-blue-500 cursor-pointer w-full sm:w-64"
              >
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((u) => (
                    <option key={u.discord_id} value={u.discord_id}>
                      [#{u.collar_number || '000'}] {u.rp_name || `${u.forename} ${u.surname}`}
                    </option>
                  ))
                ) : (
                  <option value="">No personnel found</option>
                )}
              </select>
            </div>
          </div>

          {selectedUser ? (
            <div className="flex flex-col gap-6">
              
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
                    <span className="text-xs text-blue-400">@{selectedUser.discord?.username || 'Unknown'}</span>
                    <span className="text-xs text-neutral-500 ml-3">Collar: #{selectedUser.collar_number || '000'}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleCopy(`Email: ${selectedUser.email} | Collar: #${selectedUser.collar_number} | RP Name: ${selectedUser.rp_name}`, 'USER_SUMMARY')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold tracking-wider transition-colors cursor-pointer border border-blue-500/50"
                >
                  {copiedField === 'USER_SUMMARY' ? '✓ Summary Copied' : 'Copy Officer Summary'}
                </button>
              </div>

              {/* Officer Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                
                <div className="bg-neutral-950 border border-neutral-800 p-4 flex flex-col justify-between">
                  <span className="text-[10px] text-neutral-500 uppercase">Email Address</span>
                  <span className="text-neutral-200 font-semibold mt-1 truncate">{selectedUser.email || 'N/A'}</span>
                </div>

                <div className="bg-neutral-950 border border-neutral-800 p-4 flex flex-col justify-between">
                  <span className="text-[10px] text-neutral-500 uppercase">Collar Number</span>
                  <span className="text-neutral-200 font-semibold mt-1">#{selectedUser.collar_number || 'N/A'}</span>
                </div>

                <div className="bg-neutral-950 border border-neutral-800 p-4 flex flex-col justify-between">
                  <span className="text-[10px] text-neutral-500 uppercase">Discord ID</span>
                  <span className="text-neutral-200 font-semibold mt-1">{selectedUser.discord_id}</span>
                </div>

                <div className="bg-neutral-950 border border-neutral-800 p-4 flex flex-col justify-between">
                  <span className="text-[10px] text-neutral-500 uppercase">Date of Birth</span>
                  <span className="text-neutral-200 font-semibold mt-1">{selectedUser.dob || 'N/A'}</span>
                </div>

              </div>

              {/* Active Discord Roles & Training Logged */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                <div className="bg-neutral-950 border border-neutral-800 p-6">
                  <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider pb-2 border-b border-neutral-800 mb-4">
                    Active Discord Roles ({selectedUser.discord?.roles?.length || 0})
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

                <div className="bg-neutral-950 border border-neutral-800 p-6">
                  <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider pb-2 border-b border-neutral-800 mb-4">
                    Attended Trainings & Role History
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {trainingRecords.filter(t => t.target_discord_id === selectedUser.discord_id).length > 0 ? (
                      trainingRecords
                        .filter(t => t.target_discord_id === selectedUser.discord_id)
                        .map((t) => (
                          <div key={t.id} className="bg-neutral-900 border border-neutral-800 p-3 text-xs">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-neutral-200">{t.training_name}</span>
                              <span className="text-[10px] text-neutral-500">{new Date(t.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-neutral-400 font-sans text-xs">{t.notes || 'Completed successfully.'}</p>
                            <span className="text-[10px] text-neutral-500 mt-1 block">Added by: {t.issuer_name}</span>
                          </div>
                        ))
                    ) : (
                      <span className="text-xs text-neutral-500 italic font-sans">No training logs recorded for this officer yet.</span>
                    )}
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="p-12 text-center text-xs text-neutral-500 italic font-sans">
              Select an officer from the search dropdown above.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ROLE ADDING REQUESTS */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="bg-neutral-900 border border-neutral-800 p-6 shadow-lg">
            <h3 className="text-xs font-bold text-neutral-200 tracking-wider mb-4 pb-2 border-b border-neutral-800">
              Request Role Addition
            </h3>
            <form action={actions.submitRoleRequest} className="space-y-4">
              <input type="hidden" name="issuerName" value={currentCommandName} />
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Target Officer Discord ID</label>
                <input type="text" name="targetDiscordId" required placeholder="e.g. 126868..." className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Target Officer Name / Collar</label>
                <input type="text" name="targetName" required placeholder="e.g. J.Costin (#042)" className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Role(s) Requested to Add</label>
                <input type="text" name="roleName" required placeholder="e.g. ARV Qualified / Sergeant" className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Reason / Justification</label>
                <textarea name="reason" rows={3} required placeholder="Reason for adding this role..." className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-blue-500 resize-none" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold tracking-wider transition-colors cursor-pointer">
                Submit Role Request
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 p-6 shadow-lg">
            <h3 className="text-xs font-bold text-neutral-200 tracking-wider mb-4 pb-2 border-b border-neutral-800">
              Active Role Requests Audit Trail ({roleRequests.length})
            </h3>
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {roleRequests.length > 0 ? (
                roleRequests.map((req) => (
                  <div key={req.id} className="bg-neutral-950 border border-neutral-800 p-4 text-xs flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-neutral-100">Officer: {req.target_name} ({req.target_discord_id})</span>
                      <span className="text-[10px] text-neutral-500">{new Date(req.created_at).toLocaleString('en-GB')}</span>
                    </div>
                    <div className="text-blue-400 font-semibold">Requested Role: @{req.role_name}</div>
                    <p className="text-neutral-300 font-sans">{req.reason}</p>
                    <span className="text-[10px] text-neutral-500 pt-1 border-t border-neutral-900 block">Requested by Bronze Commander: {req.issuer_name}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-neutral-500 italic font-sans py-12 text-center">No active role requests pending.</p>
              )}
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: TRAINING RECORDS & HOSTING */}
      {activeTab === 'training' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="bg-neutral-900 border border-neutral-800 p-6 shadow-lg">
            <h3 className="text-xs font-bold text-neutral-200 tracking-wider mb-4 pb-2 border-b border-neutral-800">
              Host / Log Training Session
            </h3>
            <form action={actions.logTrainingRecord} className="space-y-4">
              <input type="hidden" name="issuerName" value={currentCommandName} />
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Training Title / Course</label>
                <input type="text" name="trainingName" required placeholder="e.g. Advanced Driving / Firearms Course" className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Attendee Discord ID</label>
                <input type="text" name="targetDiscordId" required placeholder="e.g. 126868..." className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Session Notes & Outcome</label>
                <textarea name="notes" rows={3} required placeholder="Passed assessment with commendation..." className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-blue-500 resize-none" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold tracking-wider transition-colors cursor-pointer">
                Record Training Attendance
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 p-6 shadow-lg">
            <h3 className="text-xs font-bold text-neutral-200 tracking-wider mb-4 pb-2 border-b border-neutral-800">
              Department Training History ({trainingRecords.length})
            </h3>
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {trainingRecords.length > 0 ? (
                trainingRecords.map((t) => (
                  <div key={t.id} className="bg-neutral-950 border border-neutral-800 p-4 text-xs flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-neutral-100">{t.training_name}</span>
                      <span className="text-[10px] text-neutral-500">{new Date(t.created_at).toLocaleString('en-GB')}</span>
                    </div>
                    <div className="text-neutral-400">Attendee ID: <span className="font-mono text-neutral-200">{t.target_discord_id}</span></div>
                    <p className="text-neutral-300 font-sans">{t.notes}</p>
                    <span className="text-[10px] text-neutral-500 pt-1 border-t border-neutral-900 block">Hosted by: {t.issuer_name}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-neutral-500 italic font-sans py-12 text-center">No training sessions recorded yet.</p>
              )}
            </div>
          </div>

        </div>
      )}

      {/* TAB 4: GOOGLE DRIVE & SLIDES */}
      {activeTab === 'drive' && (
        <div className="bg-neutral-900 border border-neutral-800 p-6 shadow-lg flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-neutral-800">
            <div>
              <h3 className="text-sm font-bold tracking-wider text-neutral-100">
                Met Police Google Drive & Operational Slides
              </h3>
              <p className="text-xs text-neutral-400 font-sans mt-0.5">
                Access official training presentations, SOP slides, and shared departmental documentation.
              </p>
            </div>

            <a
              href={googleDriveLinks.folderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold tracking-wider transition-colors flex items-center gap-2"
            >
              Open Google Drive Folder &rarr;
            </a>
          </div>

          <div className="w-full bg-neutral-950 border border-neutral-800 overflow-hidden shadow-2xl flex flex-col items-center">
            <div className="w-full bg-neutral-900 px-4 py-2.5 border-b border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
              <span>Embedded Google Slides Presentation Viewer</span>
              <span className="text-[10px] text-blue-400 font-mono">LIVE SYNC</span>
            </div>
            <div className="w-full h-[600px] flex items-center justify-center">
              <iframe
                src={googleDriveLinks.slidesEmbedUrl}
                className="w-full h-full border-0"
                allowFullScreen={true}
                title="Met Police Google Slides"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}