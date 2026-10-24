import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

const WHITELISTED_ROLES = [
  '1533037093306105896',
  '1532781088827507038',
  '1532841715151671436',
  '1534119748416049193',
  '1532781271477129226',
  '1533023231206883338',
  '1533023096922050750',
  '1532828055154720981',
  '1532781330071425104',
  '1546219971359543408'
];

const MASTER_ROLE_ID = '1497557905275224149';
const MANAGEMENT_ROLE_ALT = '1497557905275224148';
const DISCORD_INVITE_LINK = 'https://discord.gg/yourinvite';

async function checkUserAccess(userId: string) {
  if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
    return { inGuild: true, hasAccess: true, isManagement: true };
  }

  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${userId}`, {
      headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}` },
      cache: 'no-store'
    });
    
    // User is NOT in the Discord server
    if (res.status === 404) {
      // Delete user whitelist data from database since they left
      await supabase
        .from('user_whitelists')
        .delete()
        .eq('discord_id', userId);

      return { inGuild: false, hasAccess: false, isManagement: false };
    }

    if (!res.ok) {
      return { inGuild: true, hasAccess: false, isManagement: false };
    }

    const member = await res.json();
    const roles: string[] = Array.isArray(member.roles) ? member.roles : [];
    
    const hasMasterRole = roles.includes(MASTER_ROLE_ID);
    const hasAltManagementRole = roles.includes(MANAGEMENT_ROLE_ALT);
    const hasAnyWhitelistRole = roles.some((role) => WHITELISTED_ROLES.includes(role));

    return {
      inGuild: true,
      hasAccess: hasAnyWhitelistRole || hasMasterRole || hasAltManagementRole,
      isManagement: hasMasterRole || hasAltManagementRole
    };
  } catch (err) {
    console.error('Discord membership check error:', err);
    return { inGuild: false, hasAccess: false, isManagement: false };
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('discord_user')?.value;
  
  const user = userCookie ? JSON.parse(userCookie) : { username: 'Operator', nickname: 'Operator', id: '0000', avatar: null };

  if (!user.id || user.id === '0000') {
    redirect('/');
  }

  const access = await checkUserAccess(user.id);

  // If they left the server or do not have the required roles, redirect them away
  if (!access.inGuild || !access.hasAccess) {
    redirect('/whitelistprocess');
  }

  const displayName = user.nickname || user.username;
  const avatarUrl = user.avatar 
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` 
    : 'https://cdn.discordapp.com/embed/avatars/0.png';

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100 flex flex-col justify-between select-none antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-10 py-5 bg-neutral-900/95 border-b border-neutral-800 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded bg-neutral-800 border border-neutral-700 overflow-hidden">
            <Image src="/logo.png" alt="Server Logo" fill sizes="40px" className="object-cover" />
          </div>
          <h1 className="text-sm font-semibold tracking-widest uppercase text-neutral-200">
            Central Operations Portal
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold tracking-wider uppercase transition-colors"
          >
            Dashboard
          </Link>

          {access.isManagement && (
            <Link
              href="/dashboard/management"
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold tracking-wider uppercase transition-colors"
            >
              Management
            </Link>
          )}

          <Link
            href="/dashboard/command"
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold tracking-wider uppercase transition-colors"
          >
            Command
          </Link>

          {/* Profile Dropdown */}
          <details className="relative group ml-2">
            <summary className="flex items-center gap-2.5 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 px-3 py-1.5 cursor-pointer list-none transition-colors">
              <img 
                src={avatarUrl} 
                alt="User Avatar" 
                className="w-6 h-6 rounded-full border border-neutral-700 object-cover" 
              />
              <span className="text-xs font-semibold text-neutral-200 tracking-wider">
                {displayName}
              </span>
              <svg className="w-3.5 h-3.5 text-neutral-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>

            <div className="absolute right-0 mt-2 w-48 bg-neutral-900 border border-neutral-800 shadow-2xl py-1 z-40">
              <div className="px-4 py-2 border-b border-neutral-800 mb-1">
                <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">Signed in as</p>
                <p className="text-xs font-semibold text-neutral-200 truncate">{displayName}</p>
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

      {/* Page Contents */}
      <div className="flex-1 flex flex-col my-4">
        {children}
      </div>

      {/* Global Uniform Footer */}
      <footer className="flex flex-col sm:flex-row items-center justify-between px-8 py-3 bg-neutral-900/90 border-t border-neutral-800 text-xs text-neutral-400 w-full shrink-0">
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