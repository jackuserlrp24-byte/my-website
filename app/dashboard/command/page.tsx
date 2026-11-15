import Link from 'next/link';
import { getPortalUser } from '@/lib/portal';
import { COMMAND_DEPARTMENTS, canOpenDepartment } from '@/lib/departments';

export const dynamic = 'force-dynamic';

export default async function CommandHubPage() {
  const user = await getPortalUser();
  const can = (slug: string) =>
    !!user && canOpenDepartment(user.roles, user.isManagement, COMMAND_DEPARTMENTS[slug]);

  const departments = [
    {
      title: 'Metropolitan Police Command',
      subtitle: 'MET POLICE',
      description: 'Manage Met Police officer dossiers, look up collar numbers, issue role assignments, audit training records, and access operational Google Drive slides.',
      href: '/dashboard/command/met-police',
      available: true,
      accentColor: 'bg-blue-600',
      badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/30'
    },
    {
      title: 'London Ambulance Service Command',
      subtitle: 'LAS',
      description: 'Run LAS and Control recruitment: open or close divisions, set application links and review applications.',
      href: '/dashboard/command/las',
      available: can('las'),
      accentColor: 'bg-emerald-600',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    },
    {
      title: 'London Fire Brigade Command',
      subtitle: 'LFB',
      description: 'Run LFB and Control recruitment: open or close divisions, set application links and review applications.',
      href: '/dashboard/command/lfb',
      available: can('lfb'),
      accentColor: 'bg-amber-600',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    },
    {
      title: 'Leave of Absence (LOA)',
      subtitle: 'ALL COMMAND',
      description: 'Submit an LOA. The portal checks it, authorises or declines it, adds [LOA] to your Discord name while you are away and logs it for command.',
      href: '/dashboard/command/loa',
      available: true,
      accentColor: 'bg-[#5865F2]',
      badgeColor: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30'
    },
  ];

  return (
    <div className="flex flex-col px-8 mt-4 max-w-[1450px] mx-auto w-full gap-6 pb-16 select-none font-mono antialiased">
      
      {/* Header Banner */}
      <div className="w-full bg-neutral-900 border border-neutral-800 p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#5865F2]" />
        <div>
          <span className="text-[10px] text-[#5865F2] tracking-widest uppercase block mb-1">
            Departmental Leadership Hub
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-100">
            Command & Management Suites
          </h2>
          <p className="text-xs text-neutral-400 mt-1 font-sans">
            Select a departmental command division below to access personnel dossiers, role management requests, training logs, and shared Google Drive resources.
          </p>
        </div>
      </div>

      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {departments.map((dept) => (
          <div 
            key={dept.href}
            className="bg-neutral-900 border border-neutral-800 p-6 shadow-lg flex flex-col justify-between relative overflow-hidden group hover:border-neutral-700 transition-colors"
          >
            <div className={`absolute top-0 left-0 right-0 h-1 ${dept.accentColor}`} />
            
            <div className="space-y-4">
              <span className={`px-2.5 py-1 text-[10px] font-bold border rounded-sm inline-block ${dept.badgeColor}`}>
                {dept.subtitle}
              </span>
              <div>
                <h3 className="text-base font-bold text-neutral-100 tracking-tight mb-2">
                  {dept.title}
                </h3>
                <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                  {dept.description}
                </p>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-neutral-800">
              {dept.available ? (
                <Link
                  href={dept.href}
                  className="w-full py-2.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  Access Command Suite &rarr;
                </Link>
              ) : (
                <div className="w-full py-2.5 border border-neutral-800 text-neutral-600 text-xs font-semibold uppercase tracking-wider flex items-center justify-center">
                  Met Police Gold Command only
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}