import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PanelGate } from '@/app/components/MaintenanceGates';
import { getDiscordSession } from '@/lib/discord-session';
import { canManageMet, canOpenCommandArea, canViewAcat, canViewCollisions, canViewFirearms, getOfficer } from '@/lib/met-access';
import FullscreenButton from '../met-police/FullscreenButton';
import CommandNav, { type CommandTab } from './CommandNav';

export const dynamic = 'force-dynamic';

// The Command page: a page of its own (not inside the officer portal) with its own dashboard and tabs.
// Each tab only shows for the people who are allowed to open it.
export default async function CommandLayout({ children }: { children: React.ReactNode }) {
  const session = await getDiscordSession();
  if (!session?.id) redirect('/');

  const officer = await getOfficer();
  if (!officer) redirect('/dashboard');
  if (!canOpenCommandArea(officer)) redirect('/met-police/incidents');

  const tabs: (CommandTab | false)[] = [
    { href: '/command', label: 'Dashboard' },
    canManageMet(officer) && { href: '/command/forms', label: 'Submitted Forms' },
    canManageMet(officer) && { href: '/command/announcements', label: 'Announcements' },
    officer.isCommand && { href: '/command/loa', label: 'LOA' },
    canViewCollisions(officer) && { href: '/command/collisions', label: 'Police Collisions' },
    canViewFirearms(officer) && { href: '/command/firearms', label: 'Firearms PIP' },
    canViewAcat(officer) && { href: '/command/acat', label: 'Anti-Corruption & Abuse' },
  ];

  return (
    <PanelGate panel="met-command">
      <div className="min-h-screen w-full flex flex-col md:flex-row bg-white text-slate-900 antialiased">
        <aside className="md:w-64 md:min-h-screen shrink-0 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col">
          <div className="px-5 py-5">
            <div className="relative h-12 w-40">
              <Image src="/met-logo.png" alt="Metropolitan Police" fill sizes="160px" className="object-contain object-left" priority />
            </div>
            <p className="mt-2 text-[11px] font-semibold tracking-widest uppercase text-slate-500">Command</p>
          </div>

          <CommandNav tabs={tabs.filter(Boolean) as CommandTab[]} />

          <div className="hidden md:flex flex-col gap-1 mt-auto px-4 py-5 border-t border-slate-200">
            <p className="px-1 text-xs text-slate-500">Signed in as</p>
            <p className="px-1 text-sm font-semibold text-slate-800 truncate">{officer.name}</p>
            <FullscreenButton className="mt-2 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer" />
            <Link href="/met-police/incidents" className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600 hover:bg-slate-100 rounded-md">
              &larr; Officer Portal
            </Link>
          </div>
        </aside>

        <main className="flex-1 min-w-0 p-6 md:p-10 select-text">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </PanelGate>
  );
}
