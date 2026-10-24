import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

const DISCORD_INVITE_LINK = 'https://discord.gg/yourinvite';

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