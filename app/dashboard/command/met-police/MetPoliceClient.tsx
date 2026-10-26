'use client';

import { useState } from 'react';
import Image from 'next/image';

interface Props {
  currentCommandName: string;
  allUsers: any[];
  roleRequests: any[];
  trainingRecords: any[];
  actions: {
    submitRoleRequest: (formData: FormData) => Promise<void>;
    logTrainingRecord: (formData: FormData) => Promise<void>;
  };
}

const metFolders = [
  { 
    id: 'fp', 
    name: '[1] FP | Emergency Response & Patrol Team', 
    desc: 'Standard response policing guidelines, shift procedures, and patrol logs.',
    subFolders: [
      { id: 'fp-frontline', name: '[1] FP | Frontline Policing', desc: 'Frontline operational resources and training slides.' },
      { id: 'fp-area-driver', name: '[2] FP | Area Driver', desc: 'Area driver qualifications and pursuit protocols.' },
      { id: 'fp-snt', name: '[3] FP | Safer Neighbourhoods Team', desc: 'SNT community engagement and local policing strategies.' },
      { id: 'fp-vsu', name: '[4] FP | Violence Suppression Unit', desc: 'VSU proactive operations and targeted intervention directives.' },
    ]
  },
  { id: 'mo2', name: '[2] MO2 | Criminal Investigation Department', desc: 'CID case files, detective SOPs, suspect interviews, and evidence lockers.' },
  { id: 'mo3', name: '[3] MO3 | Covert Policing', desc: 'Surveillance directives, undercover protocols, and sensitive operations.' },
  { id: 'mo4', name: '[4] MO4 | Forensic Services', desc: 'Crime scene examination protocols and forensic evidence submission.' },
  { id: 'mo6', name: '[5] MO6 | Public Order Planning', desc: 'Public order event planning, protest response tactics, and PSU deployments.' },
  { id: 'mo7', name: '[6] MO7 | Taskforce', desc: 'Specialist proactive taskforce operations, warrants, and high-risk entries.' },
  { id: 'mo8', name: '[7] MO8 | Roads Transport Policing Command', desc: 'RTPC vehicle pursuits, ANPR tactics, motorway protocols, and traffic legislation.' },
  { id: 'mo9', name: '[8] MO9 | Met Detention', desc: 'Custody suite management, PACE codes of practice, and prisoner processing.' },
  { id: 'mo12', name: '[9] MO12 | MetCC', desc: 'Met Police Control Centre dispatch logs, radio procedures, and CAD protocols.' },
  { id: 'mo19', name: '[10] MO19 | Firearms Command', desc: 'Authorized Firearms Officer (AFO) SOPs, ARV loadouts, and tactical firearms directives.' },
  { id: 'met-cmd', name: '[11] MET | Command Team', desc: 'Senior leadership briefs, rank policies, disciplinary frameworks, and strategic documentation.' },
];

const frontlineFiles = [
  {
    name: 'CO | MPS - IPP Training Slides',
    type: 'Google Slides Presentation',
    editUrl: 'https://docs.google.com/presentation/d/1AJzjfOaaN8sw4N0aYFy6wAnOJ-PDWHDXk4vJyACSLPo/edit?usp=drive_link',
    previewUrl: 'https://docs.google.com/presentation/d/1AJzjfOaaN8sw4N0aYFy6wAnOJ-PDWHDXk4vJyACSLPo/preview'
  },
  {
    name: 'CO | MPS - Response Driving Training Slides',
    type: 'Google Slides Presentation',
    editUrl: 'https://docs.google.com/presentation/d/1u6QZLTkeB9NZc0xGYzgN_cLy8CDam24odGnuTDGiTy0/edit?usp=drive_link',
    previewUrl: 'https://docs.google.com/presentation/d/1u6QZLTkeB9NZc0xGYzgN_cLy8CDam24odGnuTDGiTy0/preview'
  },
  {
    name: 'CO | MPS - CED Training Slides',
    type: 'Google Slides Presentation',
    editUrl: 'https://docs.google.com/presentation/d/1JJp0WZ_XJIcX0eAZMmfITBMK7xgk3M1xRLKJxJIHMwI/edit?usp=drive_link',
    previewUrl: 'https://docs.google.com/presentation/d/1JJp0WZ_XJIcX0eAZMmfITBMK7xgk3M1xRLKJxJIHMwI/preview'
  }
];

export default function MetPoliceClient({
  currentCommandName,
  allUsers,
  roleRequests,
  trainingRecords,
  actions
}: Props) {
  const [activeTab, setActiveTab] = useState<'search' | 'roles' | 'training' | 'drive'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    allUsers.length > 0 ? allUsers[0].discord_id : null
  );
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Custom Drive Navigation State
  const [activeDriveFolder, setActiveDriveFolder] = useState<string | null>(null);
  const [activeSubFolder, setActiveSubFolder] = useState<string | null>(null);

  // In-Screen Viewer State
  const [viewingFile, setViewingFile] = useState<{ name: string; previewUrl: string; editUrl: string } | null>(null);

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
  const currentFolderObj = metFolders.find(f => f.id === activeDriveFolder);
  const currentSubFolderObj = currentFolderObj?.subFolders?.find(sf => sf.id === activeSubFolder);

  return (
    <div className="flex flex-col px-8 mt-4 max-w-[1450px] mx-auto w-full gap-6 pb-16 select-none font-mono antialiased">
      
      {/* Header Banner */}
      <div className="w-full bg-neutral-900 border border-neutral-800 p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Met Police Blue Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#00247D]" />
        
        <div>
          <span className="text-[10px] text-blue-400 tracking-widest uppercase block mb-1">
            METROPOLITAN POLICE COMMAND SUITE
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-100">
            MET Police Command Portal
          </h2>
        </div>

        {/* Larger Unbordered Met Police Logo */}
        <div className="flex items-center">
          <Image 
            src="/met-logo.png" 
            alt="Metropolitan Police" 
            width={320} 
            height={80} 
            className="h-12 w-auto object-contain"
            priority
          />
        </div>
      </div>

      {/* Sub-Menu Tabs */}
      <div className="flex border-b border-neutral-800 bg-neutral-900/50 p-1 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('search')}
          className={`px-5 py-2.5 text-xs font-semibold tracking-wider transition-colors cursor-pointer border shrink-0 ${
            activeTab === 'search'
              ? 'bg-[#00247D] border-[#00247D] text-white shadow-md'
              : 'bg-neutral-950/60 hover:bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Officer Search & Dossiers
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`px-5 py-2.5 text-xs font-semibold tracking-wider transition-colors cursor-pointer border shrink-0 ${
            activeTab === 'roles'
              ? 'bg-[#00247D] border-[#00247D] text-white shadow-md'
              : 'bg-neutral-950/60 hover:bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Role Adding Requests ({roleRequests.length})
        </button>

        <button
          onClick={() => setActiveTab('training')}
          className={`px-5 py-2.5 text-xs font-semibold tracking-wider transition-colors cursor-pointer border shrink-0 ${
            activeTab === 'training'
              ? 'bg-[#00247D] border-[#00247D] text-white shadow-md'
              : 'bg-neutral-950/60 hover:bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Training Records & Hosting
        </button>

        <button
          onClick={() => { setActiveTab('drive'); setActiveDriveFolder(null); setActiveSubFolder(null); setViewingFile(null); }}
          className={`px-5 py-2.5 text-xs font-semibold tracking-wider transition-colors cursor-pointer border shrink-0 ${
            activeTab === 'drive'
              ? 'bg-[#00247D] border-[#00247D] text-white shadow-md'
              : 'bg-neutral-950/60 hover:bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Department Google Drive
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
                className="bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#00247D] w-full sm:w-48"
              />
              <select
                value={selectedUserId || ''}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#00247D] cursor-pointer w-full sm:w-64"
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
                  className="px-4 py-2 bg-[#00247D] hover:bg-[#001b5c] text-white text-xs font-semibold tracking-wider transition-colors cursor-pointer border border-[#00247D]/50"
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
                <input type="text" name="targetDiscordId" required placeholder="e.g. 126868..." className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#00247D]" />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Target Officer Name / Collar</label>
                <input type="text" name="targetName" required placeholder="e.g. J.Costin (#042)" className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#00247D]" />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Role(s) Requested to Add</label>
                <input type="text" name="roleName" required placeholder="e.g. ARV Qualified / Sergeant" className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#00247D]" />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Reason / Justification</label>
                <textarea name="reason" rows={3} required placeholder="Reason for adding this role..." className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#00247D] resize-none" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-[#00247D] hover:bg-[#001b5c] text-white text-xs font-semibold tracking-wider transition-colors cursor-pointer">
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
                <input type="text" name="trainingName" required placeholder="e.g. Advanced Driving / Firearms Course" className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#00247D]" />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Attendee Discord ID</label>
                <input type="text" name="targetDiscordId" required placeholder="e.g. 126868..." className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#00247D]" />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Session Notes & Outcome</label>
                <textarea name="notes" rows={3} required placeholder="Passed assessment with commendation..." className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#00247D] resize-none" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-[#00247D] hover:bg-[#001b5c] text-white text-xs font-semibold tracking-wider transition-colors cursor-pointer">
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

      {/* TAB 4: CUSTOM GOOGLE DRIVE FOLDERS & SLIDES */}
      {activeTab === 'drive' && (
        <div className="bg-neutral-900 border border-neutral-800 p-6 shadow-lg flex flex-col gap-6">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-neutral-800">
            <div>
              <h3 className="text-sm font-bold tracking-wider text-neutral-100">
                Met Police Google Drive Directory
              </h3>
              <p className="text-xs text-neutral-400 font-sans mt-0.5">
                {viewingFile
                  ? `Viewing Slide: ${viewingFile.name}`
                  : activeSubFolder 
                  ? `Browsing: ${currentFolderObj?.name} > ${currentSubFolderObj?.name}`
                  : activeDriveFolder 
                  ? `Browsing folder: ${currentFolderObj?.name}` 
                  : 'Select an operational department folder below to inspect division files and training slides.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {viewingFile ? (
                <button
                  onClick={() => setViewingFile(null)}
                  className="px-3 py-1.5 bg-[#00247D] hover:bg-[#001b5c] text-white text-xs font-semibold tracking-wider transition-colors cursor-pointer"
                >
                  &larr; Back to Files
                </button>
              ) : (activeDriveFolder || activeSubFolder) && (
                <button
                  onClick={() => {
                    if (activeSubFolder) {
                      setActiveSubFolder(null);
                    } else {
                      setActiveDriveFolder(null);
                    }
                  }}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold tracking-wider transition-colors cursor-pointer"
                >
                  &larr; Back
                </button>
              )}
            </div>
          </div>

          {viewingFile ? (
            /* In-Screen Google Slides Viewer */
            <div className="w-full bg-neutral-950 border border-neutral-800 flex flex-col items-center shadow-2xl">
              <div className="w-full bg-neutral-900 px-4 py-3 border-b border-neutral-800 flex items-center justify-between text-xs">
                <span className="text-neutral-200 font-bold">{viewingFile.name}</span>
                <a
                  href={viewingFile.editUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
                >
                  Open in New Tab ↗
                </a>
              </div>
              <div className="w-full h-[650px] bg-neutral-950 flex items-center justify-center p-2">
                <iframe
                  src={viewingFile.previewUrl}
                  className="w-full h-full border border-neutral-800"
                  title={viewingFile.name}
                  allowFullScreen={true}
                />
              </div>
            </div>
          ) : !activeDriveFolder ? (
            /* Root Folder Grid (All 11 Folders) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {metFolders.map((folder) => (
                <div
                  key={folder.id}
                  onClick={() => {
                    setActiveDriveFolder(folder.id);
                    setActiveSubFolder(null);
                  }}
                  className="bg-neutral-950 border border-neutral-800 hover:border-[#00247D] p-4 flex flex-col justify-between gap-4 cursor-pointer transition-all group shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-[#00247D]/20 border border-[#00247D]/40 flex items-center justify-center text-blue-400 shrink-0 rounded group-hover:bg-[#00247D]/40 transition-colors">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-200 group-hover:text-blue-400 transition-colors">
                        {folder.name}
                      </h4>
                      <p className="text-[11px] text-neutral-400 font-sans mt-1 line-clamp-2">
                        {folder.desc}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-900 flex justify-between items-center text-[10px] text-neutral-500">
                    <span>SECURE DIRECTORY</span>
                    <span className="text-blue-400 group-hover:translate-x-1 transition-transform">Open Folder &rarr;</span>
                  </div>
                </div>
              ))}
            </div>
          ) : activeDriveFolder === 'fp' && !activeSubFolder ? (
            /* Sub-Folders inside Emergency Response & Patrol Team */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentFolderObj?.subFolders?.map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => setActiveSubFolder(sub.id)}
                  className="bg-neutral-950 border border-neutral-800 hover:border-[#00247D] p-4 flex flex-col justify-between gap-4 cursor-pointer transition-all group shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-[#00247D]/20 border border-[#00247D]/40 flex items-center justify-center text-blue-400 shrink-0 rounded group-hover:bg-[#00247D]/40 transition-colors">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-200 group-hover:text-blue-400 transition-colors">
                        {sub.name}
                      </h4>
                      <p className="text-[11px] text-neutral-400 font-sans mt-1">
                        {sub.desc}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-900 flex justify-between items-center text-[10px] text-neutral-500">
                    <span>FP SUB-FOLDER</span>
                    <span className="text-blue-400 group-hover:translate-x-1 transition-transform">Open Sub-Folder &rarr;</span>
                  </div>
                </div>
              ))}
            </div>
          ) : activeSubFolder === 'fp-frontline' ? (
            /* Inside Frontline Policing: Display the 3 Training Slides */
            <div className="space-y-3">
              {frontlineFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="bg-neutral-950 border border-neutral-800 hover:border-[#00247D] p-4 flex items-center justify-between transition-all group shadow-md"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 rounded shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-100 group-hover:text-blue-400 transition-colors">
                        {file.name}
                      </h4>
                      <span className="text-[10px] text-neutral-500 font-mono block mt-0.5">{file.type}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewingFile({ name: file.name, previewUrl: file.previewUrl, editUrl: file.editUrl })}
                      className="px-3.5 py-1.5 bg-[#00247D] hover:bg-[#001b5c] text-white text-xs font-semibold tracking-wider transition-colors cursor-pointer"
                    >
                      Preview Slide
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Generic Folder Contents View */
            <div className="bg-neutral-950 border border-neutral-800 p-8 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-16 h-16 bg-[#00247D]/20 border border-[#00247D]/40 flex items-center justify-center text-blue-400 rounded-lg shadow-inner">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-bold text-neutral-100">{currentFolderObj?.name}</h4>
                <p className="text-xs text-neutral-400 font-sans max-w-md">{currentFolderObj?.desc}</p>
              </div>

              <div className="p-6 bg-neutral-900 border border-neutral-800 w-full max-w-lg mt-4 text-left space-y-2">
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest block mb-2">Folder Contents</span>
                <div className="py-2.5 px-3 bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 flex items-center justify-between">
                  <span className="flex items-center gap-2">📄 Operational_SOP_Guidelines.pdf</span>
                  <span className="text-[10px] text-blue-400">READY</span>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}