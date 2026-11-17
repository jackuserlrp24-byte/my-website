import Link from 'next/link';
import { redirect } from 'next/navigation';
import { canManageMet, canOpenCommandArea, canViewCollisions, canViewFirearms, getOfficer, hasCommandRank } from '@/lib/met-access';
import { ui } from '@/lib/met-util';

export const dynamic = 'force-dynamic';

export default async function CommandPage() {
  const officer = (await getOfficer())!;
  if (!canOpenCommandArea(officer)) redirect('/met-police/incidents');

  // Each card only appears for the people who are allowed to open it.
  const cards = [
    canViewCollisions(officer) && {
      href: '/met-police/command/collisions',
      title: 'Police Collisions',
      text: 'Log and review police vehicle collisions. Driving Standards and Gold Command.',
    },
    canViewFirearms(officer) && {
      href: '/met-police/command/firearms',
      title: 'Firearms PIP',
      text: 'Post incident procedure after a firearms incident. MO19 Command only.',
    },
    canManageMet(officer) && {
      href: '/met-police/communications',
      title: 'Announcements',
      text: 'Post notices and bulletins to every officer.',
    },
    canManageMet(officer) && {
      href: '/met-police/my-details',
      title: 'Officer details',
      text: 'Set rank, station and team for any officer.',
    },
    hasCommandRank(officer) && {
      href: '/dashboard/command/loa',
      title: 'Leave of Absence',
      text: 'Leave requests and the duty rota.',
    },
  ].filter(Boolean) as { href: string; title: string; text: string }[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className={ui.h1}>Command</h1>
        <p className={ui.sub}>Restricted tools. You only see the sections your roles allow.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="border border-slate-200 rounded-lg p-5 hover:border-[#00247D]/50 hover:bg-blue-50/40 transition-colors">
            <p className="text-base font-bold text-slate-900">{c.title}</p>
            <p className="text-sm text-slate-500 mt-1">{c.text}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
