import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PanelGate } from '@/app/components/MaintenanceGates';
import { getDiscordSession } from '@/lib/discord-session';
import { canOpenCommandArea, getOfficer } from '@/lib/met-access';
import FullscreenButton from './FullscreenButton';
import MetNav from './MetNav';
import NotificationBell from './NotificationBell';

export const dynamic = 'force-dynamic';

// Standalone white page for officers: tabs on the left, content on the right. It sits outside the dark portal layout.
export default async function MetPoliceLayout({ children }: { children: React.ReactNode }) {
  const session = await getDiscordSession();
  if (!session?.id) redirect('/');

  const officer = await getOfficer();
  if (!officer) redirect('/dashboard');

  return (
    <PanelGate panel="met-portal">
      <div className="min-h-screen w-full flex flex-col md:flex-row bg-white text-slate-900 antialiased">
        <aside className="md:w-64 md:min-h-screen shrink-0 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col">
          <div className="px-5 py-5 flex items-start justify-between gap-3">
            <div>
              <div className="relative h-12 w-40">
                <Image src="/met-logo.png" alt="Metropolitan Police" fill sizes="160px" className="object-contain object-left" priority />
              </div>
              <p className="mt-2 text-[11px] font-semibold tracking-widest uppercase text-slate-500">Officer Portal</p>
            </div>
            <NotificationBell />
          </div>

          <MetNav showCommand={canOpenCommandArea(officer)} />

          <div className="hidden md:flex flex-col gap-1 mt-auto px-4 py-5 border-t border-slate-200">
            <p className="px-1 text-xs text-slate-500">Signed in as</p>
            <p className="px-1 text-sm font-semibold text-slate-800 truncate">{officer.name}</p>
            <FullscreenButton className="mt-2 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer" />
            <Link href="/dashboard" className=" px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600 hover:bg-slate-100 rounded-md">
              &larr; Back to Portal
            </Link>
            {officer.isCommand && (
              <Link href="/services" className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600 hover:bg-slate-100 rounded-md">
                Services Hub
              </Link>
            )}
          </div>
        </aside>

        <main className="flex-1 min-w-0 p-6 md:p-10 select-text">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </PanelGate>
  );
}
