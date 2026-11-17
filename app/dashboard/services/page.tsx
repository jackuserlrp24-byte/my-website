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
  code: string;
  title: string;
  description: string;
  href: string;
  available: boolean;
  lockedText: string;
  bar: string;
  badge: string;
  links?: QuickLink[];
}

export default async function ServicesHubPage() {
  const user = await getPortalUser();
  const can = (slug: string) => !!user && canOpenDepartment(user.roles, user.isManagement, COMMAND_DEPARTMENTS[slug]);

  const met = '/dashboard/command/met-police';
  const services: Service[] = [
    {
      code: 'MET',
      title: 'Metropolitan Police Command',
      description: 'Officer dossiers, collar numbers, role requests, training records and bodycam footage.',
      href: met,
      available: !!user?.isCommand,
      lockedText: 'Met Police command only',
      bar: 'bg-blue-600',
      badge: 'text-blue-300 bg-blue-500/10 border-blue-500/30',
      links: [
        { label: 'Officer Search', hint: 'Dossiers and collar numbers', href: `${met}?tab=search` },
        { label: 'Role Requests', hint: 'Approve or deny role changes', href: `${met}?tab=roles` },
        { label: 'Training Records', hint: 'Audit who is trained', href: `${met}?tab=training` },
        { label: 'Bodycam Footage', hint: 'Last 3 minutes, with audio', href: `${met}?tab=bodycam` },
        { label: 'Google Drive', hint: 'Department slides and files', href: `${met}?tab=drive` },
      ],
    },
    {
      code: 'LAS',
      title: 'London Ambulance Service Command',
      description: 'Open or close divisions, set application links and review applications.',
      href: '/dashboard/command/las',
      available: can('las'),
      lockedText: 'LAS Gold Command only',
      bar: 'bg-emerald-600',
      links: [
        { label: 'Chain of Command', hint: 'LAS command team, ranks and numbers', href: '/dashboard/command/las/roster' },
      ],
      badge: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
    },
    {
      code: 'LFB',
      title: 'London Fire Brigade Command',
      description: 'Open or close divisions, set application links and review applications.',
      href: '/dashboard/command/lfb',
      available: can('lfb'),
      lockedText: 'Met Police Gold Command only',
      bar: 'bg-amber-600',
      badge: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
    },
    {
      code: 'LOA',
      title: 'Leave of Absence',
      description: 'Submit an LOA. It is checked, authorised or declined, and logged for command.',
      href: '/dashboard/command/loa',
      available: true,
      lockedText: '',
      bar: 'bg-[#5865F2]',
      badge: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30',
    },
  ];

  const [metService, ...others] = services;

  return (
    <div className="flex flex-col px-8 mt-4 max-w-[1450px] mx-auto w-full gap-6 pb-16 select-none font-mono antialiased">
      <div className="w-full bg-neutral-900 border border-neutral-800 p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#5865F2]" />
        <div>
          <span className="text-[10px] text-[#5865F2] tracking-widest uppercase block mb-1">Central Operations</span>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-100">Services Hub</h2>
          <p className="text-xs text-neutral-400 mt-1 font-sans">Every command service in one place. Jump straight to the tool you need.</p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-semibold uppercase tracking-wider transition-colors text-center"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Met Police: wide card with direct links into each tool */}
      <div className="bg-neutral-900 border border-neutral-800 p-6 shadow-lg relative overflow-hidden">
        <div className={`absolute top-0 left-0 right-0 h-1 ${metService.bar}`} />
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="lg:max-w-sm space-y-3">
            <span className={`px-2.5 py-1 text-[10px] font-bold border rounded-sm inline-block ${metService.badge}`}>{metService.code}</span>
            <h3 className="text-lg font-bold text-neutral-100 tracking-tight">{metService.title}</h3>
            <p className="text-xs text-neutral-400 font-sans leading-relaxed">{metService.description}</p>
            <Link
              href={metService.href}
              className="inline-block px-4 py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              Open Command Suite &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 flex-1">
            {metService.links?.map((l) => (
              <Link key={l.href} href={l.href} className="bg-neutral-950 border border-neutral-800 hover:border-blue-500/50 p-4 transition-colors group">
                <p className="text-xs font-bold text-neutral-100 uppercase tracking-wider group-hover:text-blue-300">{l.label}</p>
                <p className="text-[11px] text-neutral-500 font-sans mt-1">{l.hint}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {others.map((s) => (
          <div key={s.code} className="bg-neutral-900 border border-neutral-800 p-6 shadow-lg flex flex-col justify-between relative overflow-hidden hover:border-neutral-700 transition-colors">
            <div className={`absolute top-0 left-0 right-0 h-1 ${s.bar}`} />
            <div className="space-y-3">
              <span className={`px-2.5 py-1 text-[10px] font-bold border rounded-sm inline-block ${s.badge}`}>{s.code}</span>
              <h3 className="text-base font-bold text-neutral-100 tracking-tight">{s.title}</h3>
              <p className="text-xs text-neutral-400 font-sans leading-relaxed">{s.description}</p>
            </div>
            <div className="pt-5 mt-5 border-t border-neutral-800">
              {s.available ? (
                <Link
                  href={s.href}
                  className="w-full py-2.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center"
                >
                  Open &rarr;
                </Link>
              ) : (
                <div className="w-full py-2.5 border border-neutral-800 text-neutral-600 text-xs font-semibold uppercase tracking-wider flex items-center justify-center">
                  {s.lockedText}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
