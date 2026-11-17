import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PanelGate } from '@/app/components/MaintenanceGates';
import { getDiscordSession } from '@/lib/discord-session';
import { canLasCommand, getLasMember } from '@/lib/las-access';
import FullscreenButton from '@/app/met-police/FullscreenButton';
import LasNav from './LasNav';

export const dynamic = 'force-dynamic';

// Standalone page for London Ambulance Service staff: tabs on the left, content on the right.
// It sits outside the dark portal layout, same idea as the Met Police portal.
export default async function LasLayout({ children }: { children: React.ReactNode }) {
  const session = await getDiscordSession();
  if (!session?.id) redirect('/');

  const member = await getLasMember();
  if (!member) redirect('/services');

  return (
    <PanelGate panel="las-portal">
      <div className="min-h-screen w-full flex flex-col md:flex-row bg-white text-slate-900 antialiased">
        <aside className="md:w-64 md:min-h-screen shrink-0 bg-emerald-50/60 border-b md:border-b-0 md:border-r border-emerald-100 flex flex-col">
          <div className="px-5 py-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-emerald-700 text-white text-sm font-bold tracking-wider">LAS</span>
              <div>
                <p className="text-sm font-bold leading-tight text-slate-900">London Ambulance Service</p>
                <p className="text-[11px] font-semibold tracking-widest uppercase text-slate-500">Staff Portal</p>
              </div>
            </div>
          </div>

          <LasNav showCommand={canLasCommand(member)} />

          <div className="flex flex-col gap-1 mt-auto px-4 py-5 border-t border-emerald-100">
            <p className="px-1 text-xs text-slate-500">Signed in as</p>
            <p className="px-1 text-sm font-semibold text-slate-800 truncate">{member.name}</p>
            <FullscreenButton className="mt-2 hidden md:block px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 hover:bg-emerald-100/60 rounded-md cursor-pointer" />
            <Link href="/services" className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600 hover:bg-emerald-100/60 rounded-md">
              Services Hub
            </Link>
            <Link href="/dashboard" className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600 hover:bg-emerald-100/60 rounded-md">
              &larr; Back to Portal
            </Link>
          </div>
        </aside>

        <main className="flex-1 min-w-0 p-6 md:p-10 select-text">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </PanelGate>
  );
}
