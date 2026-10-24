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
      
      {/* Header Banner */}
      <div className="w-full bg-neutral-900/95 border border-neutral-800 p-6 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
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
          className="flex items-center gap-2 px-4 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer shrink-0 border border-[#5865F2]/50 shadow-lg"
        >
          <span className="text-base font-bold leading-none">+</span> Create Patrol
        </button>
      </div>

      {/* Create Patrol Modal */}
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
                  className="w-full bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2] transition-colors"
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
                    className="w-full bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-1.5">Shift Lead</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Insp. Harrison"
                    value={lead}
                    onChange={(e) => setLead(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2] transition-colors"
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
                    className="w-full bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-1.5">Time</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 20:00 BST"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2] transition-colors"
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
                  className="w-full bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2] resize-none transition-colors"
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

      {/* Patrols Feed */}
      <div className="grid grid-cols-1 gap-4">
        {patrols.length === 0 ? (
          <div className="bg-neutral-900/60 border border-neutral-800 p-16 text-center flex flex-col items-center justify-center shadow-lg">
            <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-2">No active patrols scheduled</p>
            <p className="text-xs text-neutral-400 max-w-sm">Click the "+ Create Patrol" button above to publish your first shift deployment.</p>
          </div>
        ) : (
          patrols.map((patrol: PatrolShift) => {
            const isUpcoming = patrol.status === 'UPCOMING';
            const currentList = attendanceLists[patrol.id] || { attending: [], unattending: [] };
            
            const isUserAttending = userNickname ? currentList.attending.includes(userNickname) : false;
            const isUserUnattending = userNickname ? currentList.unattending.includes(userNickname) : false;

            const statusColor = isUpcoming 
              ? 'text-emerald-400 border-emerald-900/50 bg-emerald-950/20' 
              : 'text-neutral-400 border-neutral-800 bg-neutral-950/20';

            return (
              <div 
                key={patrol.id}
                className="bg-neutral-900/90 border border-neutral-800 p-6 flex flex-col gap-6 hover:border-neutral-700 transition-colors shadow-xl"
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex flex-col gap-2.5 max-w-3xl">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-neutral-400 font-semibold">{patrol.id}</span>
                      <span className={`px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider border rounded-sm ${statusColor}`}>
                        {patrol.status}
                      </span>
                      <span className="text-xs font-mono text-[#5865F2] uppercase tracking-wide">{patrol.division}</span>
                    </div>

                    <h3 className="text-lg font-bold text-neutral-100 tracking-tight">
                      {patrol.title}
                    </h3>

                    <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                      {patrol.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-6 text-xs font-mono text-neutral-400 mt-1">
                      <div>Date: <span className="text-neutral-200">{patrol.date}</span></div>
                      <div>Time: <span className="text-neutral-200">{patrol.time}</span></div>
                      <div>Lead: <span className="text-neutral-200">{patrol.lead}</span></div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-3 w-full md:w-auto">
                    {isUpcoming ? (
                      <>
                        <button 
                          onClick={() => handleAttendanceToggle(patrol.id, 'attending')}
                          className={`flex-1 md:flex-initial px-5 py-3 text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer border shadow-sm ${
                            isUserAttending
                              ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-900/40'
                              : 'bg-emerald-950/30 hover:bg-emerald-900/50 border-emerald-900/50 text-emerald-400'
                          }`}
                        >
                          Book On
                        </button>
                        <button 
                          onClick={() => handleAttendanceToggle(patrol.id, 'unattending')}
                          className={`flex-1 md:flex-initial px-5 py-3 text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer border shadow-sm ${
                            isUserUnattending
                              ? 'bg-red-600 border-red-500 text-white shadow-red-900/40'
                              : 'bg-red-950/30 hover:bg-red-900/50 border-red-900/50 text-red-400'
                          }`}
                        >
                          Not Attending
                        </button>
                      </>
                    ) : (
                      <button 
                        disabled
                        className="w-full md:w-auto px-6 py-3 text-xs font-semibold tracking-wider uppercase bg-neutral-950 border border-neutral-900 text-neutral-600 cursor-not-allowed"
                      >
                        Shift Concluded
                      </button>
                    )}
                  </div>
                </div>

                {/* Attendance Breakdown Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-neutral-800 text-xs font-mono">
                  
                  {/* Booked On */}
                  <div className="bg-neutral-950 border border-neutral-800 p-4 shadow-inner">
                    <span className="text-emerald-400 uppercase tracking-widest block mb-2 font-semibold">
                      Booked On ({currentList.attending.length}):
                    </span>
                    <div className="text-neutral-300 flex flex-col gap-1.5">
                      {currentList.attending.length > 0 ? (
                        currentList.attending.map((name: string, idx: number) => (
                          <div key={idx} className="text-neutral-200 font-sans text-xs bg-neutral-900 px-3 py-1.5 border border-neutral-800 flex items-center justify-between">
                            <span>{name}</span>
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          </div>
                        ))
                      ) : (
                        <span className="text-neutral-600 italic">No personnel booked on yet.</span>
                      )}
                    </div>
                  </div>

                  {/* Not Attending */}
                  <div className="bg-neutral-950 border border-neutral-800 p-4 shadow-inner">
                    <span className="text-red-400 uppercase tracking-widest block mb-2 font-semibold">
                      Not Attending ({currentList.unattending.length}):
                    </span>
                    <div className="text-neutral-300 flex flex-col gap-1.5">
                      {currentList.unattending.length > 0 ? (
                        currentList.unattending.map((name: string, idx: number) => (
                          <div key={idx} className="text-neutral-200 font-sans text-xs bg-neutral-900 px-3 py-1.5 border border-neutral-800 flex items-center justify-between">
                            <span>{name}</span>
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                          </div>
                        ))
                      ) : (
                        <span className="text-neutral-600 italic">No personnel marked absent.</span>
                      )}
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