'use client';

import { useState, useEffect } from 'react';

interface PatrolShift {
  id: string;
  title: string;
  division: string;
  date: string;
  time: string;
  lead: string;
  status: 'UPCOMING' | 'ACTIVE' | 'CONCLUDED';
  description: string;
}

interface AttendanceState {
  [patrolId: string]: {
    attending: string[];
    unattending: string[];
  };
}

export default function PatrolsPage() {
  const [userNickname, setUserNickname] = useState<string>('');
  const [patrols, setPatrols] = useState<PatrolShift[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  const [attendanceLists, setAttendanceLists] = useState<AttendanceState>({});

  const [title, setTitle] = useState<string>('');
  const [division, setDivision] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [lead, setLead] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch('/api/auth/discord/session');
        if (res.ok) {
          const data = await res.json();
          setUserNickname(data?.user?.name || data?.name || '');
        }
      } catch (err) {
        console.error('Failed to load session user:', err);
      }
    }
    fetchSession();
  }, []);

  const handleCreatePatrol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !division) return;

    setIsSubmitting(true);

    const nextIdNum = patrols.length + 1;
    const paddedNum = nextIdNum < 10 ? `00${nextIdNum}` : nextIdNum < 100 ? `0${nextIdNum}` : `${nextIdNum}`;

    const newPatrol: PatrolShift = {
      id: `PAT-${paddedNum}`,
      title,
      division,
      date: date || 'TBD',
      time: time || 'TBD',
      lead: lead || userNickname || 'Shift Lead',
      status: 'UPCOMING',
      description: description || 'No additional briefing details provided.'
    };

    try {
      await fetch('/api/patrols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newPatrol, userNickname }),
      });

      setPatrols([newPatrol, ...patrols]);
      setIsModalOpen(false);

      setTitle('');
      setDivision('');
      setDate('');
      setTime('');
      setLead('');
      setDescription('');
    } catch (error) {
      console.error('Error posting patrol:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAttendanceToggle = async (patrolId: string, statusType: 'attending' | 'unattending') => {
    if (!userNickname) {
      alert('Session not detected. Please ensure you are logged into your Discord account via the portal.');
      return;
    }

    const current = attendanceLists[patrolId] || { attending: [], unattending: [] };
    const attending = current.attending.filter((name: string) => name !== userNickname);
    const unattending = current.unattending.filter((name: string) => name !== userNickname);

    if (statusType === 'attending') {
      attending.push(userNickname);
    } else if (statusType === 'unattending') {
      unattending.push(userNickname);
    }

    const updatedLists = {
      ...attendanceLists,
      [patrolId]: { attending, unattending }
    };

    setAttendanceLists(updatedLists);

    try {
      await fetch('/api/patrols/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patrolId, attendance: updatedLists[patrolId] }),
      });
    } catch (err) {
      console.error('Failed to sync attendance:', err);
    }
  };

  return (
    <main className="flex flex-col px-8 mt-6 max-w-[1450px] mx-auto w-full gap-6 pb-16 select-none antialiased">
      
      {/* Top Banner */}
      <div className="w-full bg-neutral-900 border border-neutral-800 p-6 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#5865F2]" />
        
        <div>
          <span className="text-[10px] font-mono text-[#5865F2] tracking-widest uppercase block mb-1">
            OPERATIONAL DEPLOYMENTS
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-100">
            Server Organised Patrols
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Review upcoming community shifts and book your attendance using your connected Discord identity.
          </p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer shrink-0 border border-[#5865F2]/50 shadow-lg"
        >
          <span className="text-base font-bold leading-none">+</span> Create Patrol
        </button>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 max-w-lg w-full p-6 shadow-2xl relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#5865F2]" />
            
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-100 mb-1 font-mono">Schedule New Patrol Shift</h3>
            <p className="text-xs text-neutral-400 mb-6 font-mono">Publishing will broadcast an announcement embed to Discord.</p>

            <form onSubmit={handleCreatePatrol} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-1.5">Shift Title</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Metropolitan Police Joint Agency Shift"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2] transition-colors font-mono"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-1.5">Division</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Metropolitan Police"
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2] transition-colors font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-1.5">Shift Lead</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Insp. Harrison"
                    value={lead}
                    onChange={(e) => setLead(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2] transition-colors font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-1.5">Date</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Friday, Oct 2, 2026"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2] transition-colors font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-1.5">Time</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 20:00 BST"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2] transition-colors font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-1.5">Description / Briefing</label>
                <textarea 
                  rows={3}
                  placeholder="Enter briefing guidelines..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2] resize-none transition-colors font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold uppercase tracking-wider cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold uppercase tracking-wider cursor-pointer disabled:opacity-50 transition-colors shadow-md"
                >
                  {isSubmitting ? 'Publishing...' : 'Publish Patrol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patrol Cards Feed */}
      <div className="grid grid-cols-1 gap-6">
        {patrols.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 p-16 text-center flex flex-col items-center justify-center shadow-lg">
            <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-2">No active patrols scheduled</p>
            <p className="text-xs text-neutral-400 max-w-sm">Click the "+ Create Patrol" button above to publish your first shift deployment.</p>
          </div>
        ) : (
          patrols.map((patrol: PatrolShift) => {
            const isUpcoming = patrol.status === 'UPCOMING';
            const currentList = attendanceLists[patrol.id] || { attending: [], unattending: [] };
            
            const isUserAttending = userNickname ? currentList.attending.includes(userNickname) : false;
            const isUserUnattending = userNickname ? currentList.unattending.includes(userNickname) : false;

            return (
              <div 
                key={patrol.id}
                className="bg-neutral-900 border border-neutral-800 shadow-xl overflow-hidden flex flex-col"
              >
                {/* Shift Bar */}
                <div className="bg-neutral-950 border-b border-neutral-800 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 text-neutral-300 font-mono text-[11px] font-bold">
                      {patrol.id}
                    </span>
                    <span className="text-[11px] font-mono text-[#5865F2] font-semibold tracking-wider uppercase">
                      {patrol.division}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-neutral-700" />
                    <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider">
                      {patrol.status}
                    </span>
                  </div>

                  {/* Attendance Controls */}
                  {isUpcoming && (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleAttendanceToggle(patrol.id, 'attending')}
                        className={`px-4 py-1.5 text-xs font-mono font-semibold uppercase tracking-wider transition-all cursor-pointer border ${
                          isUserAttending
                            ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                            : 'bg-neutral-900 hover:bg-emerald-950/40 border-neutral-700 hover:border-emerald-700 text-emerald-400'
                        }`}
                      >
                        {isUserAttending ? '✓ Booked On' : 'Book On'}
                      </button>
                      <button 
                        onClick={() => handleAttendanceToggle(patrol.id, 'unattending')}
                        className={`px-4 py-1.5 text-xs font-mono font-semibold uppercase tracking-wider transition-all cursor-pointer border ${
                          isUserUnattending
                            ? 'bg-red-600 border-red-500 text-white shadow-md'
                            : 'bg-neutral-900 hover:bg-red-950/40 border-neutral-700 hover:border-red-700 text-red-400'
                        }`}
                      >
                        {isUserUnattending ? '✕ Not Attending' : 'Not Attending'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Main Content Area */}
                <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: Shift Details & Briefing */}
                  <div className="lg:col-span-2 flex flex-col justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-neutral-100 tracking-tight mb-2">
                        {patrol.title}
                      </h3>
                      <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                        {patrol.description}
                      </p>
                    </div>

                    {/* Meta Data Box */}
                    <div className="grid grid-cols-3 gap-3 bg-neutral-950 border border-neutral-800/80 p-3 mt-2">
                      <div>
                        <span className="block text-[10px] font-mono uppercase text-neutral-500 mb-0.5">Date</span>
                        <span className="text-xs font-mono font-medium text-neutral-200">{patrol.date}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-mono uppercase text-neutral-500 mb-0.5">Time</span>
                        <span className="text-xs font-mono font-medium text-neutral-200">{patrol.time}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-mono uppercase text-neutral-500 mb-0.5">Shift Lead</span>
                        <span className="text-xs font-mono font-medium text-neutral-200">{patrol.lead}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Attendance Lists */}
                  <div className="flex flex-col gap-3 bg-neutral-950 border border-neutral-800/80 p-4">
                    
                    {/* Booked On */}
                    <div>
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800/80">
                        <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                          Booked On
                        </span>
                        <span className="text-[10px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-900/80 px-2 py-0.5 rounded-sm">
                          {currentList.attending.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-[90px] overflow-y-auto pr-1">
                        {currentList.attending.length > 0 ? (
                          currentList.attending.map((name: string, idx: number) => (
                            <span 
                              key={idx} 
                              className="px-2.5 py-1 bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-neutral-200 flex items-center gap-1.5"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              {name}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] font-mono text-neutral-600 italic">No personnel booked on.</span>
                        )}
                      </div>
                    </div>

                    {/* Not Attending */}
                    <div className="pt-2 border-t border-neutral-800/80">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800/80">
                        <span className="text-[11px] font-mono font-bold text-red-400 uppercase tracking-wider">
                          Not Attending
                        </span>
                        <span className="text-[10px] font-mono bg-red-950/60 text-red-400 border border-red-900/80 px-2 py-0.5 rounded-sm">
                          {currentList.unattending.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-[90px] overflow-y-auto pr-1">
                        {currentList.unattending.length > 0 ? (
                          currentList.unattending.map((name: string, idx: number) => (
                            <span 
                              key={idx} 
                              className="px-2.5 py-1 bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-neutral-200 flex items-center gap-1.5"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                              {name}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] font-mono text-neutral-600 italic">No personnel marked absent.</span>
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}