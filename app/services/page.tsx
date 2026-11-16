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
  hover: string;
  links?: QuickLink[];
}

export default async function ServicesHubPage() {
  const user = await getPortalUser();
  const can = (slug: string) => !!user && canOpenDepartment(user.roles, user.isManagement, COMMAND_DEPARTMENTS[slug]);

  const met = '/dashboard/command/met-police';
  const services: Service[] = [
    {
      code: 'MET',
      title: 'Metropolitan Police',
      description: 'Officer dossiers, collar numbers, role requests, training records and bodycam footage.',
      href: met,
      available: true,
      lockedText: '',
      bar: 'bg-blue-600',
      badge: 'text-blue-300 bg-blue-500/10 border-blue-500/30',
      hover: 'hover:border-blue-500/50',
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
      title: 'London Ambulance Service',
      description: 'Open or close divisions, set application links and review applications.',
      href: '/dashboard/command/las',
      available: can('las'),
      lockedText: 'Met Police Gold Command only',
      bar: 'bg-emerald-600',
      badge: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
      hover: 'hover:border-emerald-500/50',
    },
    {
      code: 'LFB',
      title: 'London Fire Brigade',
      description: 'Open or close divisions, set application links and review applications.',
      href: '/dashboard/command/lfb',
      available: can('lfb'),
      lockedText: 'Met Police Gold Command only',
      bar: 'bg-amber-600',
      badge: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
      hover: 'hover:border-amber-500/50',
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
      hover: 'hover:border-[#5865F2]/50',
    },
  ];

  return (
    <div className="flex flex-col items-center px-6 sm:px-10 py-12 w-full max-w-[1100px] mx-auto gap-10 font-mono">
      <div className="text-center space-y-2">
        <span className="text-[10px] text-[#5865F2] tracking-widest uppercase block">Central Operations</span>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-100">Services Hub</h1>
        <p className="text-sm text-neutral-400 font-sans">Which service do you need? Pick one to get started.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {services.map((s) => (
          <div key={s.code} className={`bg-neutral-900 border border-neutral-800 p-6 shadow-lg flex flex-col justify-between relative overflow-hidden transition-colors ${s.available ? s.hover : ''}`}>
            <div className={`absolute top-0 left-0 right-0 h-1 ${s.bar}`} />
            <div className="space-y-3">
              <span className={`px-2.5 py-1 text-[10px] font-bold border rounded-sm inline-block ${s.badge}`}>{s.code}</span>
              <h2 className="text-lg font-bold text-neutral-100 tracking-tight">{s.title}</h2>
              <p className="text-xs text-neutral-400 font-sans leading-relaxed">{s.description}</p>

              {s.available && s.links && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {s.links.map((l) => (
                    <Link key={l.href} href={l.href} className="bg-neutral-950 border border-neutral-800 hover:border-blue-500/50 p-3 transition-colors group">
                      <p className="text-[11px] font-bold text-neutral-100 uppercase tracking-wider group-hover:text-blue-300">{l.label}</p>
                      <p className="text-[10px] text-neutral-500 font-sans mt-0.5">{l.hint}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-5 mt-5 border-t border-neutral-800">
              {s.available ? (
                <Link
                  href={s.href}
                  className="w-full py-2.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center"
                >
                  Open {s.code} &rarr;
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
