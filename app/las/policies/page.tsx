import { LAS_POLICIES } from '@/lib/las-policies';
import { ui } from '@/lib/met-util';

export default function LasPoliciesPage() {
  const groups = Array.from(new Set(LAS_POLICIES.map((p) => p.category)));

  return (
    <div className="space-y-8">
      <div>
        <h1 className={ui.h1}>Policies</h1>
        <p className={ui.sub}>Service policies and operational guidance. If you are unsure, ask command before you act.</p>
      </div>

      {groups.map((group) => (
        <section key={group} className="space-y-3">
          <h2 className={ui.eyebrow}>{group}</h2>
          {LAS_POLICIES.filter((p) => p.category === group).map((p) => (
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
    </div>
  );
}
