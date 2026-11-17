import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import BackgroundSlideshow from './BackgroundSlideshow';
import { DEVELOPER_ROLE_IDS, MANAGEMENT_ROLE_IDS, WHITELISTED_ROLES, canStaffRoles, limitedAccess } from '@/lib/portal';
import { getMaintenance } from '@/lib/maintenance';
import { getDiscordSession } from '@/lib/discord-session';
import { getGuildMember } from '@/lib/discord-member';
import { hasLasAccess } from '@/lib/departments';
import { BRONZE_ROLE_ID, DEV_ROLE_ID, GOLD_ROLE_ID, SILVER_ROLE_ID, TRAINER_ROLE_ID, hasCommandAccess } from '@/lib/training-config';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TIER_ROLE_IDS = [GOLD_ROLE_ID, SILVER_ROLE_ID, BRONZE_ROLE_ID].filter(Boolean);
const DISCORD_INVITE_LINK = 'https://discord.gg/yourinvite';

const DEFAULT_AVATAR = 'https://cdn.discordapp.com/embed/avatars/0.png';

const DENIED = {
  inGuild: false,
  hasAccess: false,
  isManagement: false,
  isStaff: false,
  isTrainer: false,
  isCommand: false,
  canLas: false,
  isDeveloper: false,
  limited: null as 'developer' | 'staff' | null,
  displayName: 'Operator',
  avatarUrl: DEFAULT_AVATAR,
};

async function checkUserAccessAndFetchDetails(userId: string) {
  // Cached + retried Discord lookup. NOTE: this used to delete the user's whitelist row on any 404 and
  // treat any Discord hiccup as "no access" – that is what was wiping accounts / bouncing people out.
  const result = await getGuildMember(userId);

  if (result.status === 'error' || result.status === 'unconfigured') {
    return { ...DENIED, state: result.status };
  }
  if (result.status === 'not_member') {
    return { ...DENIED, state: 'not_member' as const };
  }

  const member = result.member;
  const roles: string[] = Array.isArray(member.roles) ? member.roles : [];

  // Management + Ownership roles: in with no whitelist / RP account needed.
  const hasMasterRole = MANAGEMENT_ROLE_IDS.some((r) => roles.includes(r));
  const hasAltManagementRole = false;
  const hasAnyWhitelistRole = roles.some((role) => WHITELISTED_ROLES.includes(role));
  const hasTierRole = roles.some((role) => TIER_ROLE_IDS.includes(role));
  // Developer-only / staff-only accounts see just their own panel(s), not the general portal.
  const limited = limitedAccess(roles);

  // Live display name resolution (Server Nickname -> Global Name -> Username)
  const displayName = member.nick || member.user?.global_name || member.user?.username || 'Operator';

  // Live avatar resolution
  const avatarUrl = member.user?.avatar
    ? `https://cdn.discordapp.com/avatars/${userId}/${member.user.avatar}.png`
    : DEFAULT_AVATAR;

  return {
    state: 'ok' as const,
    inGuild: true,
    hasAccess: hasAnyWhitelistRole || hasMasterRole || hasAltManagementRole || hasTierRole || limited !== null,
    isManagement: hasMasterRole || hasAltManagementRole,
    isStaff: canStaffRoles(roles), // same rule as the staff pages/actions
    limited,
    isTrainer: hasMasterRole || hasAltManagementRole || (!!TRAINER_ROLE_ID && roles.includes(TRAINER_ROLE_ID)) || hasTierRole,
    isCommand: hasCommandAccess(roles),
    canLas: hasLasAccess(roles),
    isDeveloper: roles.some((role) => DEVELOPER_ROLE_IDS.includes(role)),
    displayName,
    avatarUrl,
  };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getDiscordSession();

  if (!session?.id) {
    redirect('/');
  }

  const access = await checkUserAccessAndFetchDetails(session.id);

  // Discord is rate limiting / down, or the bot is misconfigured. That is NOT the user's fault, so
  // don't bounce them to the whitelist page (and certainly don't touch their account): ask them to retry.
  if (access.state === 'error' || access.state === 'unconfigured') {
    return (
      <main className="min-h-screen w-full bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-bold">Couldn&apos;t reach Discord</h1>
          <p className="text-sm text-neutral-400">
            {access.state === 'unconfigured'
              ? 'The portal is missing its Discord configuration. Please let a developer know.'
              : 'Discord is busy right now. You are still signed in – give it a few seconds and try again.'}
          </p>
          <a href="/dashboard" className="inline-block px-4 py-2 rounded border border-neutral-700 text-sm hover:bg-neutral-800">
            Try again
          </a>
        </div>
      </main>
    );
  }

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
              href="/staff"
              target="_blank"
              rel="noopener noreferrer"
              className="relative px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold tracking-wider uppercase transition-colors"
            >
              Staff Panel
              {pendingAppeals > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-mono font-bold rounded-full">{pendingAppeals}</span>
              )}
            </Link>
          )}

          {access.isDeveloper && (
            <Link
              href="/developer"
              target="_blank"
              rel="noopener noreferrer"
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
              href="/dashboard/roster"
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold tracking-wider uppercase transition-colors"
            >
              Roster
            </Link>
          )}

          {/* Role-Locked Command Button */}
          {(access.isCommand || access.canLas) && (
            <Link
              href="/dashboard/command"
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold tracking-wider uppercase transition-colors"
            >
              Command
            </Link>
          )}

          {/* Services Hub: opens in a new browser tab */}
          {(!access.limited || access.canLas) && (
            <Link
              href="/services"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-[#5865F2]/20 hover:bg-[#5865F2]/30 border border-[#5865F2]/40 text-indigo-200 text-xs font-semibold tracking-wider uppercase transition-colors"
            >
              Services Hub &#8599;
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