import { cookies } from 'next/headers';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('discord_user')?.value;
  
  const user = userCookie 
    ? JSON.parse(userCookie) 
    : { username: 'Operator', nickname: 'Operator', id: '0000', avatar: null };
  
  const displayName = user.nickname || user.username;

  // Fetch live notices from Supabase
  let notices: any[] = [];
  try {
    const { data, error } = await supabase
      .from('community_notices')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!error && data) {
      notices = data;
    }
  } catch (err) {
    console.error('Failed to fetch dashboard notices:', err);
  }

  return (
    <main className="flex flex-col px-8 mt-4 max-w-[1450px] mx-auto w-full gap-4">
      
      {/* Top Welcome Banner */}
      <div className="w-full bg-neutral-900/80 border border-neutral-800 p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#5865F2]" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono text-[#5865F2] tracking-widest uppercase block mb-1">
              SECURE AUTHENTICATION VERIFIED
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-100">
              Welcome back, {displayName}
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Discord ID: <span className="font-mono text-neutral-300">{user.id}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Dashboard Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left Column: Community Notices */}
        <div className="bg-neutral-900/80 border border-neutral-800 p-6 flex flex-col justify-between backdrop-blur-md">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-800">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-200">Community Notices</h3>
              <span className="text-[10px] text-[#5865F2] font-mono">LIVE FEED</span>
            </div>
            
            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {notices.length > 0 ? (
                notices.map((notice) => (
                  <div key={notice.id} className="bg-neutral-950/80 border border-neutral-800 p-3.5 flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-neutral-200">{notice.title}</h4>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {new Date(notice.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300 font-sans leading-relaxed">
                      {notice.content}
                    </p>
                    <span className="text-[10px] text-neutral-500 font-mono mt-1 pt-1 border-t border-neutral-900 block">
                      Posted by: {notice.author_name || 'Management'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-neutral-500 italic py-4 text-center">No current notices posted.</p>
              )}
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-neutral-800/80 text-[11px] text-neutral-500 font-mono flex justify-between items-center">
            <span>STATUS: OPERATIONAL</span>
            <span className="text-neutral-400">{notices.length} Active</span>
          </div>
        </div>

        {/* Right Columns: The 3 Main Buttons / Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="bg-neutral-900/80 border border-neutral-800 p-6 flex flex-col justify-between hover:border-neutral-700 transition-colors backdrop-blur-md">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-200 mb-2">Server Roster</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">View active department personnel, division assignments, ranks, and operational readiness statuses.</p>
            </div>
            <button 
              className="mt-6 w-full py-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer"
            >
              View Roster
            </button>
          </div>

          <div className="bg-neutral-900/80 border border-neutral-800 p-6 flex flex-col justify-between hover:border-neutral-700 transition-colors backdrop-blur-md">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-200 mb-2">Training Calendar</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">Check scheduled training sessions, departmental courses, and qualification timelines.</p>
            </div>
            <button 
              className="mt-6 w-full py-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer"
            >
              View Calendar
            </button>
          </div>

          {/* Server Organised Patrols Card */}
          <div className="bg-neutral-900/80 border border-neutral-800 p-6 flex flex-col justify-between hover:border-neutral-700 transition-colors backdrop-blur-md">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-200 mb-2">Server Organised Patrols</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">Review upcoming community-wide shifts, special deployment schedules, and patrol briefings.</p>
            </div>
            <Link 
              href="/dashboard/patrols"
              className="mt-6 w-full py-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer text-center block"
            >
              View Patrols
            </Link>
          </div>

        </div>

      </div>

    </main>
  );
}