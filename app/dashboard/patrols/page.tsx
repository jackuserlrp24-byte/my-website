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
  attending?: string[];
  unattending?: string[];
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
  const [loading, setLoading] = useState<boolean>(true);
  const [attendanceLists, setAttendanceLists] = useState<AttendanceState>({});

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [sessionRes, patrolsRes] = await Promise.all([
          fetch('/api/auth/discord/session'),
          fetch('/api/patrols')
        ]);

        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          setUserNickname(sessionData?.user?.name || sessionData?.name || '');
        }

        if (patrolsRes.ok) {
          const patrolsData = await patrolsRes.json();
          if (patrolsData.success && Array.isArray(patrolsData.patrols)) {
            setPatrols(patrolsData.patrols);

            const initialAttendance: AttendanceState = {};
            patrolsData.patrols.forEach((p: PatrolShift) => {
              initialAttendance[p.id] = {
                attending: p.attending || [],
                unattending: p.unattending || []
              };
            });
            setAttendanceLists(initialAttendance);
          }
        }
      } catch (err) {
        console.error('Failed to load patrol data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, []);

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
    <main className="flex flex-col px-8 py-10 max-w-[1300px] mx-auto w-full gap-8 select-none antialiased">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1 border-b border-neutral-800 pb-6">
        <span className="text-[11px] font-mono text-[#5865F2] tracking-widest uppercase">
          Operational Deployments
        </span>
        <h1 className="text-xl font-bold tracking-tight text-neutral-100 uppercase">
          Server Organised Patrols
        </h1>
        <p className="text-xs text-neutral-400">
          Review scheduled community shifts and book your operational status. Active shifts remain accessible for 24 hours.
        </p>
      </div>

      {/* Patrol Feed */}
      <div className="flex flex-col gap-5">
        {loading ? (
          <div className="bg-neutral-900/60 border border-neutral-800/80 p-12 text-center text-xs font-mono text-neutral-500 uppercase tracking-widest">
            Loading active operational deployments...
          </div>
        ) : patrols.length === 0 ? (
          <div className="bg-neutral-900/60 border border-neutral-800/80 p-16 text-center flex flex-col items-center justify-center">
            <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-1">No active patrols scheduled</p>
            <p className="text-xs text-neutral-400">Please check back later for upcoming community shift deployments.</p>
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
                className="bg-neutral-900/80 border border-neutral-800/80 overflow-hidden flex flex-col transition-colors hover:border-neutral-700"
              >
                {/* Top Bar: ID, Division, Status & Actions */}
                <div className="bg-neutral-950/60 border-b border-neutral-800/80 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono font-semibold text-neutral-400">
                      {patrol.id}
                    </span>
                    <span className="text-neutral-700">/</span>
                    <span className="text-[11px] font-mono text-[#5865F2] uppercase tracking-wider font-medium">
                      {patrol.division}
                    </span>
                    <span className="text-neutral-700">/</span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-2 py-0.5 uppercase">
                      {patrol.status}
                    </span>
                  </div>

                  {/* Actions */}
                  {isUpcoming && (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleAttendanceToggle(patrol.id, 'attending')}
                        className={`px-3.5 py-1.5 text-[11px] font-mono font-medium uppercase tracking-wider transition-colors cursor-pointer border ${
                          isUserAttending
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-emerald-400'
                        }`}
                      >
                        {isUserAttending ? '✓ Booked On' : 'Book On'}
                      </button>
                      <button 
                        onClick={() => handleAttendanceToggle(patrol.id, 'unattending')}
                        className={`px-3.5 py-1.5 text-[11px] font-mono font-medium uppercase tracking-wider transition-colors cursor-pointer border ${
                          isUserUnattending
                            ? 'bg-red-600 border-red-500 text-white'
                            : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-red-400'
                        }`}
                      >
                        {isUserUnattending ? '✕ Not Attending' : 'Not Attending'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Content Body */}
                <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  
                  {/* Left Column: Title, Description & Metadata */}
                  <div className="lg:col-span-2 flex flex-col gap-4">
                    <div>
                      <h2 className="text-base font-bold text-neutral-100 tracking-tight mb-1.5">
                        {patrol.title}
                      </h2>
                      <p className="text-xs text-neutral-400 leading-relaxed font-normal">
                        {patrol.description}
                      </p>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-3 gap-3 pt-4 border-t border-neutral-800/60">
                      <div>
                        <span className="block text-[10px] font-mono uppercase text-neutral-500 mb-0.5">Date</span>
                        <span className="text-xs font-mono text-neutral-200">{patrol.date}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-mono uppercase text-neutral-500 mb-0.5">Time</span>
                        <span className="text-xs font-mono text-neutral-200">{patrol.time}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-mono uppercase text-neutral-500 mb-0.5">Shift Lead</span>
                        <span className="text-xs font-mono text-neutral-200">{patrol.lead}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Attendance Rosters */}
                  <div className="flex flex-col gap-4 bg-neutral-950/40 border border-neutral-800/60 p-4">
                    
                    {/* Booked On Roster */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800/60">
                        <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                          Booked On
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-900/40 px-1.5 py-0.5">
                          {currentList.attending.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
                        {currentList.attending.length > 0 ? (
                          currentList.attending.map((name: string, idx: number) => (
                            <span 
                              key={idx} 
                              className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-neutral-300 flex items-center gap-1.5"
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

                    {/* Not Attending Roster */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-neutral-800/60">
                      <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800/60">
                        <span className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-wider">
                          Not Attending
                        </span>
                        <span className="text-[10px] font-mono text-red-400 bg-red-950/60 border border-red-900/40 px-1.5 py-0.5">
                          {currentList.unattending.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
                        {currentList.unattending.length > 0 ? (
                          currentList.unattending.map((name: string, idx: number) => (
                            <span 
                              key={idx} 
                              className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-neutral-300 flex items-center gap-1.5"
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