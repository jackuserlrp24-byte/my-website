import { MET_FORMS } from '@/lib/met-forms';

export default function FormsPage() {
  const groups = new Map<string, typeof MET_FORMS>();
  for (const f of MET_FORMS) {
    const key = f.category || 'General';
    groups.set(key, [...(groups.get(key) ?? []), f]);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Forms &amp; Paperwork</h1>
        <p className="text-sm text-slate-500 mt-1">Every form you need in one place. Pick one and it opens in a new tab.</p>
      </div>

      {MET_FORMS.length === 0 ? (
        <p className="text-sm text-slate-500 border border-dashed border-slate-300 rounded-md px-4 py-10 text-center">
          No forms have been added yet. Add them in <code className="font-mono text-slate-700">lib/met-forms.ts</code>.
        </p>
      ) : (
        Array.from(groups.entries()).map(([group, forms]) => (
          <section key={group} className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">{group}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {forms.map((f) => (
                <a
                  key={f.url}
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block border border-slate-200 rounded-lg p-4 hover:border-[#00247D] hover:bg-blue-50/40 transition-colors"
                >
                  <p className="font-semibold text-slate-900">{f.title} <span className="text-slate-400">&#8599;</span></p>
                  <p className="text-sm text-slate-500 mt-1">{f.description}</p>
                </a>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
