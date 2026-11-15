'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import LocalTime from '@/app/components/LocalTime';
import { MAINTENANCE_PANELS, defaultMessage, isDefaultMessage, schedulePhase, type MaintenanceEntry, type MaintenanceMode, type MaintenanceSchedule, type MaintenanceState } from '@/lib/maintenance-config';
import type { ActionResult } from '@/lib/portal-types';
import { endSchedule, refreshDivisionsMessage, scheduleMaintenance, updateMaintenance } from './actions';

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


/** datetime-local value (browser time) for "now + minutes". */
const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

function ScheduleTab({ schedule, onResult }: { schedule: MaintenanceSchedule | null; onResult: (r: ActionResult) => void }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [start, setStart] = useState(() => localInput(new Date(Date.now() + 60 * 60000)));
  const [end, setEnd] = useState('');
  const [message, setMessage] = useState('');
  const [site, setSite] = useState(false);
  const [panels, setPanels] = useState<string[]>([]);
  const [fivem, setFivem] = useState(true);
  const [channels, setChannels] = useState('');

  const phase = schedule ? schedulePhase(schedule) : null;
  const live = phase === 'scheduled' || phase === 'active';

  const run = (fn: () => Promise<ActionResult>) =>
    startTransition(async () => {
      const r = await fn();
      onResult(r);
      if (r.ok) router.refresh();
    });

  const submit = (startNow: boolean) => {
    if (!startNow && !start) return onResult({ ok: false, message: 'Pick a start date and time.' });
    if ((startNow || site) && !confirm(`${startNow ? 'Start maintenance NOW' : 'Schedule maintenance'}${site ? ' for the WHOLE website' : ''}${fivem ? ' and kick everyone off the FiveM server (except bypass roles)' : ''}?`)) return;
    run(() =>
      scheduleMaintenance({
        start_at: (startNow ? new Date() : new Date(start)).toISOString(),
        end_at: end ? new Date(end).toISOString() : null,
        message,
        site,
        panels,
        fivem,
        discord_channels: channels.split(/[\s,]+/).filter(Boolean),
      })
    );
  };

  const toggle = (k: string) => setPanels((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  const chk = 'accent-[#5865F2] cursor-pointer';

  return (
    <div className="space-y-6">
      {schedule && phase !== 'ended' && phase !== 'cancelled' && (
        <section className={`bg-neutral-900 border p-5 space-y-2 ${phase === 'active' ? 'border-red-500/50' : 'border-amber-500/40'}`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className={`text-[10px] font-mono tracking-widest uppercase ${phase === 'active' ? 'text-red-400' : 'text-amber-400'}`}>
                {phase === 'active' ? 'Under maintenance now' : 'Scheduled'}
              </span>
              <p className="text-sm text-neutral-200 mt-1">
                <LocalTime iso={schedule.start_at} />
                {schedule.end_at ? (
                  <>
                    {' '}to <LocalTime iso={schedule.end_at} />
                  </>
                ) : (
                  ' until ended manually'
                )}
              </p>
              <p className="text-[11px] text-neutral-500 mt-1">
                {[schedule.site && 'Whole website', schedule.panels.length ? `${schedule.panels.length} panel(s)` : '', schedule.fivem && 'FiveM server', schedule.discord_channels.length ? `${schedule.discord_channels.length} Discord channel(s)` : '']
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <button
              disabled={busy}
              onClick={() => run(endSchedule)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-[11px] font-mono font-bold uppercase tracking-wider cursor-pointer shrink-0"
            >
              {phase === 'active' ? 'End maintenance now' : 'Cancel schedule'}
            </button>
          </div>
        </section>
      )}

      <section className="bg-neutral-900 border border-neutral-800 p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">{live ? 'Replace schedule' : 'Schedule maintenance'}</h3>
          <p className="text-[11px] text-neutral-500 mt-0.5">When the start time hits, everything you tick below goes under maintenance by itself. At the end time it all reopens.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">Starts</span>
            <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className={`${inputClass} mt-1`} />
          </label>
          <label className="block">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">Ends (optional)</span>
            <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className={`${inputClass} mt-1`} />
          </label>
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          maxLength={500}
          className={`${inputClass} resize-none`}
          placeholder="Message (optional) - blank uses: under maintenance, sorry for any inconvenience"
        />

        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">What goes under maintenance</span>
          <label className="flex items-center gap-2 text-xs text-neutral-200 cursor-pointer">
            <input type="checkbox" checked={fivem} onChange={(e) => setFivem(e.target.checked)} className={chk} />
            FiveM server <span className="text-neutral-500">- blocks joining and kicks everyone without a bypass role</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-neutral-200 cursor-pointer">
            <input type="checkbox" checked={site} onChange={(e) => setSite(e.target.checked)} className={chk} />
            Whole website <span className="text-neutral-500">- founders / developers still get in</span>
          </label>
          {!site && (
            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5 pl-1 pt-1">
              {MAINTENANCE_PANELS.map((p) => (
                <label key={p.key} className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                  <input type="checkbox" checked={panels.includes(p.key)} onChange={() => toggle(p.key)} className={chk} />
                  {p.label}
                </label>
              ))}
            </div>
          )}
        </div>

        <label className="block">
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">Discord channel IDs (optional)</span>
          <input value={channels} onChange={(e) => setChannels(e.target.value)} className={`${inputClass} mt-1`} placeholder="123456789012345678, 987654321098765432" />
          <span className="text-[10px] text-neutral-600">The bot posts a notice there now, switches it to &quot;Under maintenance&quot; at the start and &quot;Complete&quot; at the end.</span>
        </label>

        <div className="flex flex-wrap justify-end gap-3 pt-1">
          <button
            disabled={busy}
            onClick={() => submit(true)}
            className="px-4 py-2.5 border border-amber-500/50 hover:bg-amber-500/10 disabled:opacity-50 text-amber-300 text-[11px] font-mono font-bold uppercase tracking-wider cursor-pointer"
          >
            Start now
          </button>
          <button
            disabled={busy}
            onClick={() => submit(false)}
            className="px-5 py-2.5 bg-[#5865F2] hover:bg-[#4752c4] disabled:opacity-50 text-white text-[11px] font-semibold uppercase tracking-wider cursor-pointer"
          >
            {busy ? 'Saving...' : 'Schedule'}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function DeveloperClient({ initial, schedule }: { initial: MaintenanceState; schedule: MaintenanceSchedule | null }) {
  const [tab, setTab] = useState<'switches' | 'schedule'>('switches');
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

      <div className="flex border-b border-neutral-800">
        {([['switches', 'Switches'], ['schedule', 'Scheduled maintenance']] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-5 py-2.5 text-[11px] font-mono font-bold uppercase tracking-wider cursor-pointer border-b-2 -mb-px ${tab === k ? 'border-amber-500 text-amber-300' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'schedule' && <ScheduleTab schedule={schedule} onResult={setResult} />}

      {tab === 'switches' && (
        <>
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
        </>
      )}
    </main>
  );
}
