import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PanelGate } from '@/app/components/MaintenanceGates';
import { hasCommandAccess } from '@/lib/training-config';
import { getDiscordSession } from '@/lib/discord-session';
import { getGuildMember } from '@/lib/discord-member';

export const dynamic = 'force-dynamic';

// Standalone page: it does NOT sit inside the portal dashboard layout, so no portal navigation bar,
// no maintenance banner and no portal footer. Same people who can see the Command tab can open it.
export default async function ServicesLayout({ children }: { children: React.ReactNode }) {
  const session = await getDiscordSession();
  if (!session?.id) redirect('/');

  const result = await getGuildMember(session.id);
  const roles = result.status === 'ok' && Array.isArray(result.member.roles) ? result.member.roles : [];
  if (!hasCommandAccess(roles)) redirect('/dashboard');

  return (
    <PanelGate panel="command">
      <div className="min-h-screen w-full flex flex-col bg-neutral-950 text-neutral-100 antialiased select-none">
        <header className="flex items-center justify-between px-6 sm:px-10 py-4 border-b border-neutral-800 bg-neutral-900/80">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded bg-neutral-800 border border-neutral-700 overflow-hidden">
              <Image src="/logo.png" alt="Central Operations" fill sizes="36px" className="object-cover" />
            </div>
            <span className="text-xs font-semibold tracking-widest uppercase text-neutral-300">Central Operations</span>
          </div>
          <Link
            href="/dashboard"
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold tracking-wider uppercase transition-colors"
          >
            Back to Portal
          </Link>
        </header>
        <main className="flex-1 flex flex-col">{children}</main>
        <footer className="px-6 sm:px-10 py-3 border-t border-neutral-800 text-[11px] font-mono text-neutral-500 text-center">
          &copy; Central Operations. All rights reserved.
        </footer>
      </div>
    </PanelGate>
  );
}
