'use client';

import { useState, useEffect } from 'react';

interface PatrolShift {
  id: string;
  title: string;
  date: string;
  time: string;
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
        // Read user nickname directly from discord_user cookie or session endpoint
        const match = document.cookie.match(new RegExp('(^| )discord_user=([^;]+)'));
        if (match) {
          const cookieUser = JSON.parse(decodeURIComponent(match[2]));
          setUserNickname(cookieUser.nickname || cookieUser.username || '');
        } else {
          const sessionRes = await fetch('/api/auth/discord/session').catch(() => null);
          if (sessionRes && sessionRes.ok) {
            const sessionData = await sessionRes.json();
            setUserNickname(sessionData?.user?.name || sessionData?.name || sessionData?.displayName || '');
          }
        }

        const patrolsRes = await fetch('/api/patrols');
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
            Review active community shifts. Patrols automatically remain active for 24 hours.
          </p>
        </div>
      </div>

      {/* Patrol Cards Feed */}
      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="bg-neutral-900 border border-neutral-800 p-12 text-center text-xs font-mono text-neutral-500 uppercase tracking-widest">
            Loading active operational deployments...
          </div>
        ) : patrols.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 p-16 text-center flex flex-col items-center justify-center shadow-lg">
            <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-2">No active patrols scheduled in the last 24 hours</p>
            <p className="text-xs text-neutral-400 max-w-sm">Please check back later for upcoming community shift deployments.</p>
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
                className="bg-neutral-900 border border-neutral-800 shadow-xl overflow-hidden flex flex-col rounded-none"
              >
                {/* Top Control Bar */}
                <div className="bg-neutral-950 border-b border-neutral-800 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-medium text-neutral-400">
                      {patrol.id}
                    </span>
                    <span className="text-neutral-700">/</span>
                    <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
                      {patrol.status}
                    </span>
                  </div>

                  {/* Attendance Buttons */}
                  {isUpcoming && (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleAttendanceToggle(patrol.id, 'attending')}
                        className={`px-4 py-1.5 text-xs font-mono font-medium uppercase tracking-wider transition-colors cursor-pointer border rounded-none ${
                          isUserAttending
                            ? 'bg-neutral-800 border-neutral-600 text-neutral-100'
                            : 'bg-neutral-950 hover:bg-neutral-800 border-neutral-800 text-neutral-400'
                        }`}
                      >
                        {isUserAttending ? '[ Booked On ]' : 'Book On'}
                      </button>
                      <button 
                        onClick={() => handleAttendanceToggle(patrol.id, 'unattending')}
                        className={`px-4 py-1.5 text-xs font-mono font-medium uppercase tracking-wider transition-colors cursor-pointer border rounded-none ${
                          isUserUnattending
                            ? 'bg-neutral-800 border-neutral-600 text-neutral-100'
                            : 'bg-neutral-950 hover:bg-neutral-800 border-neutral-800 text-neutral-400'
                        }`}
                      >
                        {isUserUnattending ? '[ Not Attending ]' : 'Not Attending'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Main Content Area */}
                <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  
                  {/* Left Column: Title & Briefing */}
                  <div className="lg:col-span-2 flex flex-col gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-neutral-200 tracking-tight mb-1.5">
                        {patrol.title}
                      </h3>
                      <p className="text-xs text-neutral-400 leading-relaxed font-normal">
                        {patrol.description}
                      </p>
                    </div>

                    {/* Tactical Metadata Cards */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-800/80">
                      
                      {/* Date Card */}
                      <div className="bg-neutral-950 border border-neutral-800/80 p-3 flex flex-col gap-1 relative overflow-hidden">
                        <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-[#5865F2]" />
                        <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                          Date
                        </span>
                        <span className="text-xs font-mono font-bold text-neutral-200 tracking-wide">
                          {patrol.date}
                        </span>
                      </div>

                      {/* Time Card */}
                      <div className="bg-neutral-950 border border-neutral-800/80 p-3 flex flex-col gap-1 relative overflow-hidden">
                        <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-[#5865F2]" />
                        <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                          Time (Start - End)
                        </span>
                        <span className="text-xs font-mono font-bold text-neutral-200 tracking-wide">
                          {patrol.time}
                        </span>
                      </div>

                    </div>
                  </div>

                  {/* Right Column: Rosters */}
                  <div className="flex flex-col gap-4 bg-neutral-950 border border-neutral-800 p-4 rounded-none">
                    
                    {/* Booked On */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800">
                        <span className="text-[10px] font-mono font-medium text-neutral-400 uppercase tracking-wider">
                          Booked On
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400">
                          {currentList.attending.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
                        {currentList.attending.length > 0 ? (
                          currentList.attending.map((name: string, idx: number) => (
                            <span 
                              key={idx} 
                              className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-neutral-300 rounded-none"
                            >
                              {name}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] font-mono text-neutral-600">No personnel booked on.</span>
                        )}
                      </div>
                    </div>

                    {/* Not Attending */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-neutral-800">
                      <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800">
                        <span className="text-[10px] font-mono font-medium text-neutral-400 uppercase tracking-wider">
                          Not Attending
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400">
                          {currentList.unattending.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
                        {currentList.unattending.length > 0 ? (
                          currentList.unattending.map((name: string, idx: number) => (
                            <span 
                              key={idx} 
                              className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-neutral-300 rounded-none"
                            >
                              {name}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] font-mono text-neutral-600">No personnel marked absent.</span>
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