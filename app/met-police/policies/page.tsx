import Link from 'next/link';
import { POLICIES } from '@/lib/met-policies';
import { ui } from '@/lib/met-util';

export default function PoliciesPage() {
  const groups = Array.from(new Set(POLICIES.map((p) => p.category)));

  return (
    <div className="space-y-8">
      <div>
        <h1 className={ui.h1}>Policies</h1>
        <p className={ui.sub}>Force policies and operational guidance. If you are ever unsure, ask command before you act.</p>
      </div>

      {groups.map((group) => (
        <section key={group} className="space-y-3">
          <h2 className={ui.eyebrow}>{group}</h2>
          {POLICIES.filter((p) => p.category === group).map((p) => (
            <details key={p.title} className={ui.card}>
              <summary className="cursor-pointer">
                <span className="text-sm font-bold text-slate-900">{p.title}</span>
                <span className="block text-xs text-slate-500 mt-0.5">{p.summary}</span>
              </summary>
              <ul className="mt-3 space-y-2 text-sm text-slate-700 list-disc pl-5">
                {p.body.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </details>
          ))}
        </section>
      ))}

      <Link href="/met-police/law-book" className="block border border-slate-200 rounded-lg p-4 hover:border-[#00247D] hover:bg-blue-50/40 transition-colors">
        <p className="font-semibold text-slate-900">Law Book &rarr;</p>
        <p className="text-sm text-slate-500 mt-1">Search offences and police powers.</p>
      </Link>
    </div>
  );
}
