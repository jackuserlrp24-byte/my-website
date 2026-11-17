import Link from 'next/link';
import { canManageMet, canViewAcat, canViewCollisions, canViewFirearms, getOfficer } from '@/lib/met-access';
import { supabaseAdmin } from '@/lib/portal';
import { ui } from '@/lib/met-util';

export const dynamic = 'force-dynamic';

export default async function CommandDashboard() {
  const officer = (await getOfficer())!;
  const manager = canManageMet(officer);

  // Quick numbers for command
  let activeIncidents = 0;
  let waitingForms = 0;
  let notices = 0;
  if (manager) {
    const [inc, forms, ann] = await Promise.all([
      supabaseAdmin.from('mdt_incidents').select('cad_ref', { count: 'exact', head: true }).neq('status', 'Closed'),
      supabaseAdmin.from('mdt_eforms').select('ref', { count: 'exact', head: true }).in('status', ['waiting', 'edited']),
      supabaseAdmin.from('met_announcements').select('id', { count: 'exact', head: true }),
    ]);
    activeIncidents = inc.count ?? 0;
    waitingForms = forms.count ?? 0;
    notices = ann.count ?? 0;
  }

  const stats = [
    { label: 'Active incidents', value: activeIncidents, href: '/met-police/incidents' },
    { label: 'Forms waiting review', value: waitingForms, href: '/command/forms' },
    { label: 'Notices & bulletins posted', value: notices, href: '/command/announcements' },
  ];

  // Each card only appears for the people who are allowed to open it.
  const cards = [
    canViewCollisions(officer) && { href: '/command/collisions', title: 'Police Collisions', text: 'Log and review police vehicle collisions. Driving Standards and Gold Command.' },
    canViewFirearms(officer) && { href: '/command/firearms', title: 'Firearms PIP', text: 'Post incident procedure after a firearms incident. MO19 Command only.' },
    canViewAcat(officer) && { href: '/command/acat', title: 'Anti-Corruption & Abuse Team', text: 'Case files, referrals, intelligence and integrity checks. ACAT and Gold Command only.' },
    manager && { href: '/met-police/my-details', title: 'Officer details', text: 'Set rank, station and team for any officer.' },
  ].filter(Boolean) as { href: string; title: string; text: string }[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className={ui.h1}>Command Dashboard</h1>
        <p className={ui.sub}>Welcome, {officer.name}. You only see the sections your roles allow.</p>
      </div>

      {manager && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((s) => (
            <Link key={s.label} href={s.href} className="border border-slate-200 rounded-lg p-5 hover:border-[#00247D]/50 hover:bg-blue-50/40 transition-colors">
              <p className="text-3xl font-bold text-[#00247D]">{s.value}</p>
              <p className="text-sm text-slate-500 mt-1">{s.label}</p>
            </Link>
          ))}
        </div>
      )}

      {cards.length > 0 && (
        <section className="space-y-3">
          <h2 className={ui.eyebrow}>Sections</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cards.map((c) => (
              <Link key={c.href} href={c.href} className="border border-slate-200 rounded-lg p-5 hover:border-[#00247D]/50 hover:bg-blue-50/40 transition-colors">
                <p className="text-base font-bold text-slate-900">{c.title}</p>
                <p className="text-sm text-slate-500 mt-1">{c.text}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
