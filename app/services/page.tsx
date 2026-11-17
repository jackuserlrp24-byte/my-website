import Link from 'next/link';
import { getPortalUser } from '@/lib/portal';
import { COMMAND_DEPARTMENTS, canOpenDepartment } from '@/lib/departments';

export const dynamic = 'force-dynamic';

interface QuickLink {
  label: string;
  hint: string;
  href: string;
}

interface Service {
  key: 'met' | 'las' | 'lfb';
  code: string;
  title: string;
  description: string;
  href: string;
  available: boolean;
  lockedText: string;
  bar: string;
  badge: string;
  hover: string;
  links: QuickLink[];
}

export default async function ServicesHubPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const { service: picked } = await searchParams;
  const user = await getPortalUser();
  const can = (slug: string) => !!user && canOpenDepartment(user.roles, user.isManagement, COMMAND_DEPARTMENTS[slug]);

  const met = '/met-police';
  const services: Service[] = [
    {
      key: 'met',
      code: 'MET',
      title: 'Metropolitan Police',
      description: 'The officer portal: incidents, reports, checks, evidence, statements, roster, policies, communications and your details.',
      href: met,
      available: true,
      lockedText: '',
      bar: 'bg-blue-600',
      badge: 'text-blue-300 bg-blue-500/10 border-blue-500/30',
      hover: 'hover:border-blue-500/50',
      links: [
        { label: 'My Incidents', hint: 'Assigned incidents, updates, references', href: `${met}/incidents` },
        { label: 'Reports', hint: 'Crime, use of force, stop and search', href: `${met}/reports` },
        { label: 'Checks', hint: 'Person and vehicle checks (simulated)', href: `${met}/checks` },
        { label: 'Evidence', hint: 'Upload evidence, view exhibits', href: `${met}/evidence` },
        { label: 'Statements', hint: 'Create and submit MG11 statements', href: `${met}/statements` },
        { label: 'Roster', hint: 'Every officer, rank, station, team', href: `${met}/roster` },
        { label: 'Policies', hint: 'Force policies, operational guidance', href: `${met}/policies` },
        { label: 'Communications', hint: 'Notices, bulletins, messages', href: `${met}/communications` },
        { label: 'My Details', hint: 'Rank, collar number, station, team', href: `${met}/my-details` },
      ],
    },
    {
      key: 'las',
      code: 'LAS',
      title: 'London Ambulance Service',
      description: 'Open or close divisions, set application links and review applications.',
      href: '/dashboard/command/las',
      available: can('las'),
      lockedText: 'Met Police Gold Command only',
      bar: 'bg-emerald-600',
      badge: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
      hover: 'hover:border-emerald-500/50',
      links: [{ label: 'LAS Command Suite', hint: 'Divisions, application links and applications', href: '/dashboard/command/las' }],
    },
    {
      key: 'lfb',
      code: 'LFB',
      title: 'London Fire Brigade',
      description: 'Open or close divisions, set application links and review applications.',
      href: '/dashboard/command/lfb',
      available: can('lfb'),
      lockedText: 'Met Police Gold Command only',
      bar: 'bg-amber-600',
      badge: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
      hover: 'hover:border-amber-500/50',
      links: [{ label: 'LFB Command Suite', hint: 'Divisions, application links and applications', href: '/dashboard/command/lfb' }],
    },
  ];

  const selected = services.find((s) => s.key === picked && s.available);

  // Step 2: the chosen service and its tools.
  if (selected) {
    return (
      <div className="flex flex-col px-6 sm:px-10 py-12 w-full max-w-[1100px] mx-auto gap-8 font-mono">
        <Link href="/services" className="text-[11px] text-neutral-400 hover:text-neutral-200 uppercase tracking-wider w-fit">
          &larr; Change service
        </Link>

        <div className="bg-neutral-900 border border-neutral-800 p-6 shadow-lg relative overflow-hidden flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className={`absolute top-0 left-0 right-0 h-1 ${selected.bar}`} />
          <div className="lg:max-w-sm space-y-3">
            <span className={`px-2.5 py-1 text-[10px] font-bold border rounded-sm inline-block ${selected.badge}`}>{selected.code}</span>
            <h1 className="text-2xl font-bold text-neutral-100 tracking-tight">{selected.title}</h1>
            <p className="text-xs text-neutral-400 font-sans leading-relaxed">{selected.description}</p>
            <Link
              href={selected.href}
              className="inline-block px-4 py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              Open {selected.code} &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
            {selected.links.map((l) => (
              <Link key={l.href} href={l.href} className={`bg-neutral-950 border border-neutral-800 ${selected.hover} p-4 transition-colors`}>
                <p className="text-xs font-bold text-neutral-100 uppercase tracking-wider">{l.label}</p>
                <p className="text-[11px] text-neutral-500 font-sans mt-1">{l.hint}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Step 1: which service?
  return (
    <div className="flex flex-col items-center px-6 sm:px-10 py-12 w-full max-w-[1100px] mx-auto gap-10 font-mono">
      <div className="text-center space-y-2">
        <span className="text-[10px] text-[#5865F2] tracking-widest uppercase block">Central Operations</span>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-100">Services Hub</h1>
        <p className="text-sm text-neutral-400 font-sans">Which service do you need? Pick one to continue.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {services.map((s) => {
          const body = (
            <>
              <div className={`absolute top-0 left-0 right-0 h-1 ${s.bar}`} />
              <div className="space-y-3">
                <span className={`px-2.5 py-1 text-[10px] font-bold border rounded-sm inline-block ${s.badge}`}>{s.code}</span>
                <h2 className="text-lg font-bold text-neutral-100 tracking-tight">{s.title}</h2>
                <p className="text-xs text-neutral-400 font-sans leading-relaxed">{s.description}</p>
              </div>
              <div className="pt-5 mt-5 border-t border-neutral-800 text-xs font-semibold uppercase tracking-wider">
                {s.available ? <span className="text-neutral-200">Select &rarr;</span> : <span className="text-neutral-600">{s.lockedText}</span>}
              </div>
            </>
          );
          const cls = 'bg-neutral-900 border border-neutral-800 p-6 shadow-lg flex flex-col justify-between relative overflow-hidden transition-colors';
          return s.available ? (
            <Link key={s.key} href={`/services?service=${s.key}`} className={`${cls} ${s.hover} hover:bg-neutral-900/70`}>
              {body}
            </Link>
          ) : (
            <div key={s.key} className={`${cls} opacity-60`}>
              {body}
            </div>
          );
        })}
      </div>

      <Link href="/dashboard/command/loa" className="text-[11px] text-neutral-400 hover:text-neutral-200 uppercase tracking-wider">
        Submit a Leave of Absence &rarr;
      </Link>
    </div>
  );
}
