import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import BackgroundSlideshow from './BackgroundSlideshow';
import { DEVELOPER_ROLE_IDS, WHITELISTED_ROLES, limitedAccess } from '@/lib/portal';
import { getMaintenance } from '@/lib/maintenance';
import { BRONZE_ROLE_ID, DEV_ROLE_ID, GOLD_ROLE_ID, SILVER_ROLE_ID, STAFF_ROLE_ID, TRAINER_ROLE_ID, hasCommandAccess } from '@/lib/training-config';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

const MASTER_ROLE_ID = '1497557905275224149'; // Command / Bronze Commander Role ID
const MANAGEMENT_ROLE_ALT = '1497557905275224148';
const TIER_ROLE_IDS = [GOLD_ROLE_ID, SILVER_ROLE_ID, BRONZE_ROLE_ID].filter(Boolean);
const DISCORD_INVITE_LINK = 'https://discord.gg/yourinvite';

async function checkUserAccessAndFetchDetails(userId: string) {
  if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
    return { inGuild: true, hasAccess: true, isManagement: true, isStaff: true, isTrainer: true, isCommand: true, isDeveloper: true, limited: null as 'developer' | 'staff' | null, displayName: 'Operator', avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png' };
  }

  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${userId}`, {
      headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}` },
      cache: 'no-store'
    });
    
    if (res.status === 404) {
      await supabase
        .from('user_whitelists')
        .delete()
        .eq('discord_id', userId);

      return { inGuild: false, hasAccess: false, isManagement: false, isStaff: false, isTrainer: false, isCommand: false, isDeveloper: false, limited: null as 'developer' | 'staff' | null, displayName: 'Operator', avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png' };
    }

    if (!res.ok) {
      return { inGuild: true, hasAccess: false, isManagement: false, isStaff: false, isTrainer: false, isCommand: false, isDeveloper: false, limited: null as 'developer' | 'staff' | null, displayName: 'Operator', avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png' };
    }

    const member = await res.json();
    const roles: string[] = Array.isArray(member.roles) ? member.roles : [];
    
    const hasMasterRole = roles.includes(MASTER_ROLE_ID);
    const hasAltManagementRole = roles.includes(MANAGEMENT_ROLE_ALT);
    const hasAnyWhitelistRole = roles.some((role) => WHITELISTED_ROLES.includes(role));
    const hasTierRole = roles.some((role) => TIER_ROLE_IDS.includes(role));
    // Developer-only / staff-only accounts see just their own panel(s), not the general portal.
    const limited = limitedAccess(roles);

    // Live display name resolution (Server Nickname -> Global Name -> Username)
    const displayName = member.nick || member.user?.global_name || member.user?.username || 'Operator';
    
    // Live avatar resolution
    const avatarUrl = member.user?.avatar 
      ? `https://cdn.discordapp.com/avatars/${userId}/${member.user.avatar}.png` 
      : 'https://cdn.discordapp.com/embed/avatars/0.png';

    return {
      inGuild: true,
      hasAccess: hasAnyWhitelistRole || hasMasterRole || hasAltManagementRole || hasTierRole || limited !== null,
      isManagement: hasMasterRole || hasAltManagementRole,
      isStaff: hasMasterRole || hasAltManagementRole || roles.includes(GOLD_ROLE_ID) || roles.includes(SILVER_ROLE_ID) || (!!STAFF_ROLE_ID && roles.includes(STAFF_ROLE_ID)),
      limited,
      isTrainer: hasMasterRole || hasAltManagementRole || (!!TRAINER_ROLE_ID && roles.includes(TRAINER_ROLE_ID)) || hasTierRole,
      isCommand: hasCommandAccess(roles),
      isDeveloper: roles.some((role) => DEVELOPER_ROLE_IDS.includes(role)),
      displayName,
      avatarUrl
    };
  } catch (err) {
    console.error('Discord membership check error:', err);
    return { inGuild: false, hasAccess: false, isManagement: false, isStaff: false, isTrainer: false, isCommand: false, isDeveloper: false, limited: null as 'developer' | 'staff' | null, displayName: 'Operator', avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png' };
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('discord_user')?.value;
  
  let user: { id?: string } = { id: '0000' };
  try {
    if (userCookie) user = JSON.parse(userCookie);
  } catch {
    user = { id: '0000' };
  }

  if (!user.id || user.id === '0000') {
    redirect('/');
  }

  const access = await checkUserAccessAndFetchDetails(user.id);

  if (!access.inGuild || !access.hasAccess) {
    redirect('/whitelistprocess');
  }

  // Developers get a reminder while anything is switched off (they can still see everything).
  let maintenanceNote = '';
  if (access.isDeveloper) {
    const m = await getMaintenance();
    const parts = [...(m.site.on ? ['Whole website'] : []), ...Object.entries(m.panels).filter(([, v]) => v.on).map(([k]) => k)];
    if (parts.length) maintenanceNote = parts.join(', ');
  }

  // Pending ban appeals badge for staff (silently 0 if the table is not set up yet)
  let pendingAppeals = 0;
  if (access.isStaff) {
    const { count } = await supabase.from('ban_appeals').select('id', { count: 'exact', head: true }).eq('status', 'pending');
    pendingAppeals = count ?? 0;
  }

  return (
    <div className="min-h-screen w-full text-neutral-100 flex flex-col justify-between select-none antialiased relative overflow-x-hidden">
      
      {/* Client-side Background Slideshow */}
      <BackgroundSlideshow />

      {/* Top Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-10 py-5 bg-neutral-900/90 border-b border-neutral-800 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded bg-neutral-800 border border-neutral-700 overflow-hidden">
            <Image src="/logo.png" alt="Server Logo" fill sizes="40px" className="object-cover" />
          </div>
          <h1 className="text-sm font-semibold tracking-widest uppercase text-neutral-200">
            Central Operations Portal
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {!access.limited && (
          <Link
            href="/dashboard"
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold tracking-wider uppercase transition-colors"
          >
            Dashboard
          </Link>
          )}

          {!access.limited && (
          <Link
            href="/dashboard/trainings"
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold tracking-wider uppercase transition-colors"
          >
            Trainings
          </Link>
          )}

          {!access.limited && (
          <Link
            href="/dashboard/divisions"
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold tracking-wider uppercase transition-colors"
          >
            Divisions
          </Link>
          )}

          {access.isStaff && (
            <Link
              href="/dashboard/staff"
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold tracking-wider uppercase transition-colors"
            >
              Staff Panel
            </Link>
          )}

          {access.isStaff && (
            <Link
              href="/dashboard/appeals"
              className="relative px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold tracking-wider uppercase transition-colors"
            >
              Ban Appeals
              {pendingAppeals > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-mono font-bold rounded-full">{pendingAppeals}</span>
              )}
            </Link>
          )}

          {access.isDeveloper && (
            <Link
              href="/dashboard/developer"
              className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 text-xs font-semibold tracking-wider uppercase transition-colors"
            >
              Developer
            </Link>
          )}

          {access.isTrainer && (
            <Link
              href="/dashboard/trainer"
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold tracking-wider uppercase transition-colors"
            >
              Trainer Panel
            </Link>
          )}

          {access.isManagement && (
            <Link
              href="/dashboard/management"
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold tracking-wider uppercase transition-colors"
            >
              Management
            </Link>
          )}

          {/* Role-Locked Command Button */}
          {access.isCommand && (
            <Link
              href="/dashboard/command"
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold tracking-wider uppercase transition-colors"
            >
              Command
            </Link>
          )}

          {/* Profile Dropdown */}
          <details className="relative group ml-2">
            <summary className="flex items-center gap-2.5 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 px-3 py-1.5 cursor-pointer list-none transition-colors">
              <img 
                src={access.avatarUrl} 
                alt="User Avatar" 
                className="w-6 h-6 rounded-full border border-neutral-700 object-cover" 
              />
              <span className="text-xs font-semibold text-neutral-200 tracking-wider">
                {access.displayName}
              </span>
              <svg className="w-3.5 h-3.5 text-neutral-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>

            <div className="absolute right-0 mt-2 w-48 bg-neutral-900 border border-neutral-800 shadow-2xl py-1 z-40">
              <div className="px-4 py-2 border-b border-neutral-800 mb-1">
                <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">Signed in as</p>
                <p className="text-xs font-semibold text-neutral-200 truncate">{access.displayName}</p>
              </div>

              <Link
                href="/dashboard/profile"
                className="block px-4 py-2 text-xs font-semibold tracking-wider text-neutral-300 hover:bg-neutral-800 hover:text-white uppercase transition-colors"
              >
                Profile
              </Link>

              <Link
                href="/"
                className="block px-4 py-2 text-xs font-semibold tracking-wider text-red-400 hover:bg-red-500/10 hover:text-red-300 uppercase transition-colors border-t border-neutral-800 mt-1 pt-2"
              >
                Log Out
              </Link>
            </div>
          </details>
        </div>
      </header>

      {maintenanceNote && (
        <div className="z-10 bg-amber-500/10 border-b border-amber-500/30 px-8 py-2 text-center text-[11px] font-mono text-amber-300 uppercase tracking-wider">
          Maintenance active: {maintenanceNote} - only founders / developers can see it
        </div>
      )}

      {/* Page Contents */}
      <div className="flex-1 flex flex-col my-4 z-10">
        {children}
      </div>

      {/* Global Uniform Footer */}
      <footer className="flex flex-col sm:flex-row items-center justify-between px-8 py-3 bg-neutral-900/90 border-t border-neutral-800 text-xs text-neutral-400 w-full shrink-0 backdrop-blur-md z-10">
        <div className="max-w-[1450px] mx-auto w-full flex flex-col sm:flex-row items-center justify-between">
          <p className="font-mono text-[11px]">&copy; Central Operations. All rights reserved.</p>
          
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <span className="text-neutral-500">Support / Comms:</span>
            <a
              href={DISCORD_INVITE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-200 hover:text-white font-medium tracking-wide underline underline-offset-4 transition-colors"
            >
              Discord
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}