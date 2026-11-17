import Link from 'next/link';
import { redirect } from 'next/navigation';
import { canViewAcat, getOfficer } from '@/lib/met-access';
import { ACAT_CATEGORIES } from '@/lib/met-acat';
import { ui } from '@/lib/met-util';

export const dynamic = 'force-dynamic';

export default async function AcatPage() {
  const officer = (await getOfficer())!;
  if (!canViewAcat(officer)) redirect('/met-police/command');

  return (
    <div className="space-y-6">
      <div>
        <Link href="/met-police/command" className="text-xs font-semibold text-[#00247D] hover:underline">&larr; Command</Link>
        <h1 className={`${ui.h1} mt-2`}>Anti-Corruption &amp; Abuse Team</h1>
        <p className={ui.sub}>Restricted. Only the Anti-Corruption &amp; Abuse Team and Gold Command can see these categories.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ACAT_CATEGORIES.map((c) => (
          <Link key={c.slug} href={`/met-police/command/acat/${c.slug}`} className="border border-slate-200 rounded-lg p-5 hover:border-[#00247D]/50 hover:bg-blue-50/40 transition-colors">
            <p className="text-base font-bold text-slate-900">{c.title}</p>
            <p className="text-sm text-slate-500 mt-1">{c.text}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
