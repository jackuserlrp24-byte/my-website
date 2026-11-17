import Link from 'next/link';
import { getLasMember, canLasCommand } from '@/lib/las-access';
import { getLasRoster } from '@/lib/las-discord';
import { supabaseAdmin } from '@/lib/portal';
import { COMMAND_DEPARTMENTS } from '@/lib/departments';
import { ui } from '@/lib/met-util';

export const dynamic = 'force-dynamic';

export default async function LasOverviewPage() {
  const member = (await getLasMember())!;
  const [roster, divisions] = await Promise.all([
    getLasRoster(),
    supabaseAdmin.from('divisions').select('status').in('department', COMMAND_DEPARTMENTS.las.divisionDepartments),
  ]);
  const open = (divisions.data ?? []).filter((d) => d.status === 'open').length;

  const stats = [
    { label: 'Open divisions', value: divisions.error ? '-' : open },
    { label: 'Command team', value: roster.error ? '-' : roster.rows.length },
  ];

  const links = [
    { href: '/las/divisions', title: 'Divisions', hint: 'See which LAS and Control divisions are recruiting and apply.' },
    { href: '/las/roster', title: 'Chain of Command', hint: 'Your command team, their ranks and numbers.' },
    { href: '/las/policies', title: 'Policies', hint: 'Service policies and operational guidance.' },
    { href: '/las/my-details', title: 'My Details', hint: 'Your name, number and rank.' },
    ...(canLasCommand(member) ? [{ href: '/dashboard/command/las', title: 'LAS Command Suite', hint: 'Open or close divisions, set links and review applications.' }] : []),
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className={ui.h1}>Welcome, {member.name}</h1>
        <p className={ui.sub}>London Ambulance Service staff portal.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-md">
        {stats.map((s) => (
          <div key={s.label} className={ui.card}>
            <p className={ui.eyebrow}>{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className={ui.eyebrow}>Quick links</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="block border border-slate-200 rounded-lg p-4 hover:border-emerald-700 hover:bg-emerald-50/50 transition-colors">
              <p className="font-semibold text-slate-900">{l.title} &rarr;</p>
              <p className="text-sm text-slate-500 mt-1">{l.hint}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
