'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import LocalTime from '@/app/components/LocalTime';
import { MAINTENANCE_PANELS, defaultMessage, isDefaultMessage, type MaintenanceEntry, type MaintenanceMode, type MaintenanceState } from '@/lib/maintenance-config';
import type { ActionResult } from '@/lib/portal-types';
import { refreshDivisionsMessage, updateMaintenance } from './actions';

const inputClass =
  'w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2] select-text';

type Status = 'open' | MaintenanceMode;
const statusOf = (e: { on: boolean; mode: MaintenanceMode }): Status => (!e.on ? 'open' : e.mode);

/** Open / Coming soon / Maintenance */
function StatusPicker({ value, onChange, label }: { value: Status; onChange: (v: Status) => void; label: string }) {
  const opts: { v: Status; text: string; active: string }[] = [
    { v: 'open', text: 'Open', active: 'bg-emerald-600 border-emerald-500 text-white' },
    { v: 'coming_soon', text: 'Coming soon', active: 'bg-[#5865F2] border-[#5865F2] text-white' },
    { v: 'maintenance', text: 'Maintenance', active: 'bg-amber-500 border-amber-400 text-black' },
  ];
  return (
    <div role="radiogroup" aria-label={label} className="flex shrink-0">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={`px-3 py-1.5 border text-[10px] font-mono font-bold uppercase tracking-wider cursor-pointer -ml-px first:ml-0 ${
            value === o.v ? o.active : 'bg-neutral-950 border-neutral-700 text-neutral-400 hover:bg-neutral-800'
          }`}
        >
          {o.text}
        </button>
      ))}
    </div>
  );
}

/** Applies a status to an entry, swapping the message only if it is still one of the stock messages. */
function withStatus(e: MaintenanceEntry, v: Status, site: boolean): MaintenanceEntry {
  if (v === 'open') return { ...e, on: false };
  const message = !e.message.trim() || isDefaultMessage(e.message) ? defaultMessage(v, site) : e.message;
  return { on: true, mode: v, message };
}

export default function DeveloperClient({ initial }: { initial: MaintenanceState }) {
  const [state, setState] = useState<MaintenanceState>(initial);
  const [saved, setSaved] = useState<MaintenanceState>(initial);
  const [result, setResult] = useState<ActionResult | null>(null);
  const router = useRouter();
  const [busy, startTransition] = useTransition();

  const dirty = JSON.stringify({ s: state.site, p: state.panels }) !== JSON.stringify({ s: saved.site, p: saved.panels });
  const closedCount = MAINTENANCE_PANELS.filter((p) => state.panels[p.key]?.on).length;

  const setPanel = (key: string, patch: Partial<MaintenanceEntry>) =>
    setState((s) => ({ ...s, panels: { ...s.panels, [key]: { ...s.panels[key], ...patch } } }));

  const setPanelStatus = (key: string, v: Status) =>
    setState((s) => ({ ...s, panels: { ...s.panels, [key]: withStatus(s.panels[key], v, false) } }));

  const setAll = (v: Status) =>
    setState((s) => ({ ...s, panels: Object.fromEntries(MAINTENANCE_PANELS.map((p) => [p.key, withStatus(s.panels[p.key], v, false)])) }));

  function save() {
    if (state.site.on && !saved.site.on && !confirm('Put the WHOLE website under maintenance? Everyone except founders and developers will be locked out.')) return;
    startTransition(async () => {
      const r = await updateMaintenance(state);
      setResult(r);
      if (r.ok) {
        setSaved(state);
        router.refresh(); // updates the nav banner straight away
      }
    });
  }

  return (
    <main className="flex flex-col px-8 mt-6 max-w-[1000px] mx-auto w-full gap-6 pb-16 select-none antialiased">
      <div className="w-full bg-neutral-900 border border-neutral-800 p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
        <span className="text-[10px] font-mono text-amber-400 tracking-widest uppercase block mb-1">FOUNDER / DEVELOPER</span>
        <h2 className="text-2xl font-bold tracking-tight text-neutral-100">Developer Panel</h2>
        <p className="text-xs text-neutral-400 mt-1">
          Set any panel, command suite (LAS, LFB, Met Police, LOA) or the whole website to Coming soon or Maintenance. Visitors see your message; founders and developers can still get in. Changes are logged in the moderation log channel.
        </p>
        {saved.updated_at && (
          <p className="text-[10px] font-mono text-neutral-600 mt-2">
            Last changed by {saved.updated_by ?? 'Unknown'} · <LocalTime iso={saved.updated_at} />
          </p>
        )}
      </div>

      {result && (
        <div
          className={`border p-3 text-xs font-mono ${
            result.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {result.message}
        </div>
      )}

      {/* Whole website */}
      <section className={`bg-neutral-900 border ${state.site.on ? 'border-red-500/50' : 'border-neutral-800'} p-5 space-y-3`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">Whole website</h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">Locks every page (including the login and appeal pages) for everyone except founders and developers.</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusPicker
              value={statusOf(state.site)}
              onChange={(v) => setState((s) => ({ ...s, site: withStatus(s.site, v, true) }))}
              label="Whole website status"
            />
          </div>
        </div>
        <textarea
          value={state.site.message}
          onChange={(e) => setState((s) => ({ ...s, site: { ...s.site, message: e.target.value } }))}
          rows={2}
          maxLength={500}
          className={`${inputClass} resize-none`}
          placeholder="Message shown to visitors"
        />
      </section>

      {/* Panels */}
      <section className="bg-neutral-900 border border-neutral-800">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-neutral-800">
          <div>
            <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">Panels</h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">{closedCount} of {MAINTENANCE_PANELS.length} switched off</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAll('coming_soon')} className="px-3 py-1.5 border border-neutral-700 hover:bg-neutral-800 text-neutral-300 text-[10px] font-mono uppercase tracking-wider cursor-pointer">
              All coming soon
            </button>
            <button onClick={() => setAll('maintenance')} className="px-3 py-1.5 border border-neutral-700 hover:bg-neutral-800 text-neutral-300 text-[10px] font-mono uppercase tracking-wider cursor-pointer">
              All maintenance
            </button>
            <button onClick={() => setAll('open')} className="px-3 py-1.5 border border-neutral-700 hover:bg-neutral-800 text-neutral-300 text-[10px] font-mono uppercase tracking-wider cursor-pointer">
              Reopen all
            </button>
          </div>
        </div>

        <div className="divide-y divide-neutral-800">
          {MAINTENANCE_PANELS.map((p) => {
            const e = state.panels[p.key];
            return (
              <div key={p.key} className="p-5 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-100">{p.label}</p>
                    <p className="text-[10px] font-mono text-neutral-600">{p.path}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusPicker value={statusOf(e)} onChange={(v) => setPanelStatus(p.key, v)} label={`${p.label} status`} />
                  </div>
                </div>
                {e.on && (
                  <input
                    value={e.message}
                    onChange={(ev) => setPanel(p.key, { message: ev.target.value })}
                    maxLength={500}
                    className={inputClass}
                    placeholder="Message shown to visitors"
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-neutral-900 border border-neutral-800 p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">Discord division status message</h3>
          <p className="text-[11px] text-neutral-500 mt-0.5">Re-posts or refreshes the open / closed list in its Discord channel.</p>
        </div>
        <button
          disabled={busy}
          onClick={() => startTransition(async () => setResult(await refreshDivisionsMessage()))}
          className="px-4 py-2 border border-neutral-700 hover:bg-neutral-800 disabled:opacity-50 text-neutral-200 text-[11px] font-mono uppercase tracking-wider cursor-pointer"
        >
          Refresh message
        </button>
      </section>

      <div className="sticky bottom-4 flex items-center justify-end gap-3">
        {dirty && <span className="text-[11px] font-mono text-amber-300 bg-neutral-900 border border-neutral-800 px-3 py-2">Unsaved changes</span>}
        <button
          disabled={busy || !dirty}
          onClick={save}
          className="px-6 py-3 bg-[#5865F2] hover:bg-[#4752c4] disabled:opacity-40 text-white text-xs font-semibold uppercase tracking-wider cursor-pointer shadow-xl"
        >
          {busy ? 'Saving...' : 'Apply changes'}
        </button>
      </div>
    </main>
  );
}
