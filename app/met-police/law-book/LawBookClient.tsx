'use client';

import { useMemo, useState } from 'react';
import type { LawEntry } from '@/lib/met-lawbook';

export default function LawBookClient({ entries }: { entries: LawEntry[] }) {
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('All');

  const cats = useMemo(() => ['All', ...Array.from(new Set(entries.map((e) => e.category)))], [entries]);
  const q = query.trim().toLowerCase();
  const shown = entries.filter(
    (e) => (cat === 'All' || e.category === cat) && (!q || [e.offence, e.law, e.summary, e.category].some((v) => v.toLowerCase().includes(q)))
  );

  return (
    <div className="space-y-5">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by offence, act or keyword..."
        className="w-full border border-slate-300 rounded-md px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-[#00247D]"
      />

      <div className="flex flex-wrap gap-2">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border cursor-pointer transition-colors ${
              cat === c ? 'bg-[#00247D] border-[#00247D] text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-slate-500 border border-dashed border-slate-300 rounded-md px-4 py-10 text-center">Nothing found.</p>
      ) : (
        <div className="space-y-3">
          {shown.map((e) => (
            <article key={`${e.law}-${e.offence}`} className="border border-slate-200 rounded-lg p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-bold text-slate-900">{e.offence}</h2>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{e.category}</span>
              </div>
              <p className="text-xs font-semibold text-[#00247D] mt-1">{e.law}</p>
              <p className="text-sm text-slate-600 mt-2">{e.summary}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
