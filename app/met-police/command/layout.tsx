import { redirect } from 'next/navigation';
import { PanelGate } from '@/app/components/MaintenanceGates';
import { canManageMet, canOpenCommandArea, canViewAcat, canViewCollisions, canViewFirearms, getOfficer } from '@/lib/met-access';
import CommandNav, { type CommandTab } from './CommandNav';

export const dynamic = 'force-dynamic';

// The Command area: its own dashboard and tabs. Each tab only shows for the people who are allowed to open it.
export default async function Layout({ children }: { children: React.ReactNode }) {
  const officer = await getOfficer();
  if (!officer || !canOpenCommandArea(officer)) redirect('/met-police/incidents');

  const tabs: (CommandTab | false)[] = [
    { href: '/met-police/command', label: 'Dashboard' },
    canManageMet(officer) && { href: '/met-police/command/forms', label: 'Submitted Forms' },
    canManageMet(officer) && { href: '/met-police/command/announcements', label: 'Announcements' },
    officer.isCommand && { href: '/met-police/command/loa', label: 'LOA' },
    canViewCollisions(officer) && { href: '/met-police/command/collisions', label: 'Police Collisions' },
    canViewFirearms(officer) && { href: '/met-police/command/firearms', label: 'Firearms PIP' },
    canViewAcat(officer) && { href: '/met-police/command/acat', label: 'Anti-Corruption & Abuse' },
  ];

  return (
    <PanelGate panel="met-command">
      <div className="space-y-6">
        <CommandNav tabs={tabs.filter(Boolean) as CommandTab[]} />
        {children}
      </div>
    </PanelGate>
  );
}
