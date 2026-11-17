'use client';

import { useEffect, useState, useTransition } from 'react';
import { deleteClip, getClipPlayback } from './actions';

export interface Clip {
  id: string;
  created_at: string;
  officer_name: string | null;
  target_name: string | null;
  trigger: string | null;
  serial: string | null;
  coords: string | null;
  total_ms: number;
  segment_count: number;
}

const fmtDur = (ms: number) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const fmtWhen = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const reason = (c: Clip) => (c.trigger === 'firearm' ? 'Fired a firearm' : c.trigger === 'taser' ? 'Fired a taser' : `Hit ${c.target_name || 'a player'}`);

export default function VideoClient({ clips, canDelete, showOfficer, initialId }: { clips: Clip[]; canDelete: boolean; showOfficer: boolean; initialId: string | null }) {
  const [list, setList] = useState(clips);
  const [selId, setSelId] = useState<string | null>(null);
  const [segs, setSegs] = useState<{ url: string; ms: number }[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sel = list.find((c) => c.id === selId) || null;

  function open(id: string) {
    setSelId(id);
    setSegs(null);
    setIdx(0);
    setMsg(null);
    startTransition(async () => {
      const r = await getClipPlayback(id);
      if (r.ok && r.segments) setSegs(r.segments);
      else setMsg(r.message || 'Could not load footage.');
    });
  }

  // Opened from the Incidents tab ("Watch").
  useEffect(() => {
    if (initialId && clips.some((c) => c.id === initialId)) open(initialId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function remove(id: string) {
    if (!confirm('Delete this footage permanently?')) return;
    startTransition(async () => {
      const r = await deleteClip(id);
      setMsg(r.message);
      if (r.ok) {
        setList((l) => l.filter((c) => c.id !== id));
        setSelId(null);
        setSegs(null);
      }
    });
  }

  const elapsedBefore = segs ? segs.slice(0, idx).reduce((a, s) => a + s.ms, 0) : 0;
  const totalMs = segs ? segs.reduce((a, s) => a + s.ms, 0) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <div className="lg:col-span-1 border border-slate-200 rounded-lg p-3 flex flex-col gap-2 max-h-[600px] overflow-y-auto">
        {list.length === 0 && <p className="text-sm text-slate-500 px-2 py-6 text-center">No footage yet.</p>}
        {list.map((c) => (
          <button
            key={c.id}
            onClick={() => open(c.id)}
            className={`text-left p-3 rounded-md border cursor-pointer transition-colors ${selId === c.id ? 'bg-blue-50 border-[#00247D]' : 'border-slate-200 hover:bg-slate-50'}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-900 truncate">{showOfficer ? c.officer_name || 'Unknown officer' : reason(c)}</span>
              <span className="text-[11px] text-slate-500 shrink-0">{fmtWhen(c.created_at)}</span>
            </div>
            {showOfficer && <p className="text-xs text-slate-600 mt-0.5 truncate">{reason(c)}</p>}
            <p className="text-[11px] text-slate-500 mt-0.5">
              {fmtDur(c.total_ms)} &middot; {c.segment_count} parts{c.serial ? ` · ${c.serial}` : ''}
            </p>
          </button>
        ))}
      </div>

      <div className="lg:col-span-2 border border-slate-200 rounded-lg p-5 flex flex-col gap-4">
        {!sel ? (
          <p className="text-sm text-slate-500">Pick a clip on the left to watch it.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {sel.officer_name || 'Unknown officer'} <span className="font-normal text-slate-500">&middot; {reason(sel)}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {fmtWhen(sel.created_at)} &middot; {fmtDur(sel.total_ms)} total{sel.serial ? ` · ${sel.serial}` : ''}
                  {sel.coords ? ` · ${sel.coords}` : ''}
                </p>
              </div>
              {canDelete && (
                <button disabled={pending} onClick={() => remove(sel.id)} className="px-3 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 text-xs font-semibold rounded-md cursor-pointer">
                  Delete
                </button>
              )}
            </div>

            {msg && <p className="text-sm text-amber-700">{msg}</p>}
            {!segs && !msg && <p className="text-sm text-slate-500">Loading footage...</p>}

            {segs && (
              <>
                <video
                  key={idx}
                  src={segs[idx].url}
                  controls
                  autoPlay
                  playsInline
                  onEnded={() => setIdx((n) => (n < segs.length - 1 ? n + 1 : n))}
                  className="w-full bg-black aspect-video rounded-md"
                />
                {/* preloads the next part so the clips play back to back */}
                {segs[idx + 1] && <video key={`n${idx}`} src={segs[idx + 1].url} preload="auto" muted className="hidden" />}

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                  <span>
                    Part {idx + 1} / {segs.length} &middot; {fmtDur(elapsedBefore)} of {fmtDur(totalMs)}
                  </span>
                  <span className="flex gap-2">
                    <button disabled={idx === 0} onClick={() => setIdx(idx - 1)} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded cursor-pointer">
                      Prev
                    </button>
                    <button disabled={idx >= segs.length - 1} onClick={() => setIdx(idx + 1)} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded cursor-pointer">
                      Next
                    </button>
                  </span>
                </div>

                <details className="text-xs text-slate-500">
                  <summary className="cursor-pointer">Download parts</summary>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {segs.map((s, n) => (
                      <a key={n} href={s.url} download={`bodycam-${sel.id}-${n + 1}.webm`} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded">
                        Part {n + 1}
                      </a>
                    ))}
                  </div>
                </details>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
