'use client';

import { useRef, useState, useTransition } from 'react';
import { deleteBodycam, getBodycamPlayback } from './bodycam-actions';

export interface BodycamIncident {
  id: string;
  created_at: string;
  officer_name: string | null;
  officer_discord_id: string | null;
  target_name: string | null;
  target_discord_id: string | null;
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

export default function BodycamTab({ incidents }: { incidents: BodycamIncident[] }) {
  const [list, setList] = useState(incidents);
  const [query, setQuery] = useState('');
  const [selId, setSelId] = useState<string | null>(null);
  const [segs, setSegs] = useState<{ url: string; ms: number }[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const videoRef = useRef<HTMLVideoElement>(null);

  const q = query.trim().toLowerCase();
  const shown = list.filter(
    (i) => !q || [i.officer_name, i.target_name, i.serial, i.officer_discord_id, i.target_discord_id].some((v) => (v || '').toLowerCase().includes(q))
  );
  const sel = list.find((i) => i.id === selId) || null;

  function open(id: string) {
    setSelId(id);
    setSegs(null);
    setIdx(0);
    setMsg(null);
    startTransition(async () => {
      const r = await getBodycamPlayback(id);
      if (r.ok && r.segments) setSegs(r.segments);
      else setMsg(r.message || 'Could not load footage.');
    });
  }

  function remove(id: string) {
    if (!confirm('Delete this footage permanently?')) return;
    startTransition(async () => {
      const r = await deleteBodycam(id);
      setMsg(r.message);
      if (r.ok) {
        setList((l) => l.filter((i) => i.id !== id));
        setSelId(null);
        setSegs(null);
      }
    });
  }

  const elapsedBefore = segs ? segs.slice(0, idx).reduce((a, s) => a + s.ms, 0) : 0;
  const totalMs = segs ? segs.reduce((a, s) => a + s.ms, 0) : 0;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
      <div className="bg-neutral-900 border border-neutral-800 p-6 shadow-lg flex flex-col gap-4 xl:col-span-1">
        <div>
          <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">Bodycam Footage</h3>
          <p className="text-[11px] text-neutral-500 font-sans mt-1">
            Saved automatically (last 3 minutes, with audio) when an officer hits another player. Kept for 14 days.
          </p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search officer, player, serial or Discord ID..."
          className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#00247D]"
        />
        <div className="flex flex-col gap-2 max-h-[560px] overflow-y-auto">
          {shown.length === 0 && <p className="text-xs font-mono text-neutral-500">No footage found.</p>}
          {shown.map((i) => (
            <button
              key={i.id}
              onClick={() => open(i.id)}
              className={`text-left p-3 border cursor-pointer transition-colors ${
                selId === i.id ? 'bg-[#00247D]/30 border-[#00247D]' : 'bg-neutral-950 border-neutral-800 hover:border-neutral-600'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-neutral-100 truncate">{i.officer_name || 'Unknown officer'}</span>
                <span className="text-[10px] font-mono text-neutral-500 shrink-0">{fmtWhen(i.created_at)}</span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 truncate">Hit: {i.target_name || 'Unknown player'}</p>
              <p className="text-[10px] font-mono text-neutral-600 mt-0.5">
                {fmtDur(i.total_ms)} - {i.segment_count} parts{i.serial ? ` - ${i.serial}` : ''}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 p-6 shadow-lg flex flex-col gap-4 xl:col-span-2">
        {!sel ? (
          <p className="text-xs font-mono text-neutral-500">Pick a clip on the left to watch it.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-neutral-100">
                  {sel.officer_name || 'Unknown officer'} <span className="text-neutral-500 font-normal">hit</span> {sel.target_name || 'Unknown player'}
                </h3>
                <p className="text-[11px] font-mono text-neutral-500 mt-1">
                  {fmtWhen(sel.created_at)} - {fmtDur(sel.total_ms)} total{sel.serial ? ` - ${sel.serial}` : ''}
                  {sel.coords ? ` - ${sel.coords}` : ''}
                </p>
                <p className="text-[10px] font-mono text-neutral-600 mt-0.5">
                  Officer {sel.officer_discord_id || 'n/a'} - Player {sel.target_discord_id || 'n/a'}
                </p>
              </div>
              <button
                disabled={pending}
                onClick={() => remove(sel.id)}
                className="px-3 py-1.5 border border-red-500/40 text-red-300 hover:bg-red-500/10 disabled:opacity-50 text-[10px] font-mono uppercase tracking-wider cursor-pointer"
              >
                Delete
              </button>
            </div>

            {msg && <p className="text-xs font-mono text-amber-300">{msg}</p>}

            {!segs && !msg && <p className="text-xs font-mono text-neutral-500">Loading footage...</p>}

            {segs && (
              <>
                <video
                  key={idx}
                  ref={videoRef}
                  src={segs[idx].url}
                  controls
                  autoPlay
                  playsInline
                  onEnded={() => setIdx((n) => (n < segs.length - 1 ? n + 1 : n))}
                  className="w-full bg-black aspect-video"
                />
                {/* preloads the next part so the clips play back to back */}
                {segs[idx + 1] && <video key={`n${idx}`} src={segs[idx + 1].url} preload="auto" muted className="hidden" />}

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-neutral-400">
                  <span>
                    Part {idx + 1} / {segs.length} - {fmtDur(elapsedBefore)} of {fmtDur(totalMs)}
                  </span>
                  <span className="flex gap-2">
                    <button disabled={idx === 0} onClick={() => setIdx(idx - 1)} className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 cursor-pointer">
                      Prev
                    </button>
                    <button
                      disabled={idx >= segs.length - 1}
                      onClick={() => setIdx(idx + 1)}
                      className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {segs.map((s, n) => (
                    <button
                      key={n}
                      onClick={() => setIdx(n)}
                      className={`px-2 py-1 text-[10px] font-mono border cursor-pointer ${
                        n === idx ? 'bg-[#00247D] border-[#00247D] text-white' : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {n + 1}
                    </button>
                  ))}
                </div>

                <details className="text-[11px] text-neutral-500">
                  <summary className="cursor-pointer">Download parts</summary>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {segs.map((s, n) => (
                      <a key={n} href={s.url} download={`bodycam-${sel.id}-${n + 1}.webm`} className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono">
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
