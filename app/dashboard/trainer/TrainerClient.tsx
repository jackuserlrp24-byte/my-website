'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import type { ActionResult, Division, RoleRequest, TrainingBar } from '@/lib/portal-types';
import { REQUESTABLE_ROLES } from '@/lib/training-config';
import { TRAINING_TEMPLATES } from '@/lib/training-templates';
import { createTraining } from '@/app/dashboard/trainings/actions';
import { londonToday } from '@/lib/london-time';
import { barFromTrainings, decideRoleRequest, liftTrainingBar, requestRole } from './actions';

const inputClass =
  'w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2]';
const btnClass =
  'px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] disabled:opacity-50 text-white text-xs font-mono font-medium uppercase tracking-wider cursor-pointer';

const ROLE_OPTIONS = REQUESTABLE_ROLES.map(({ key, label, group }) => ({ key, label, group }));
const ROLE_GROUPS = Array.from(new Set(ROLE_OPTIONS.map((r) => r.group)));

export default function TrainerClient({
  divisions,
  requests,
  bars,
  canRequestRoles,
  canReview,
}: {
  divisions: Division[];
  requests: RoleRequest[];
  bars: TrainingBar[];
  canRequestRoles: boolean;
  canReview: boolean;
}) {
  const showRoles = canRequestRoles || canReview;
  const [tab, setTab] = useState<'post' | 'roles' | 'bars'>('post');
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  // Controlled bits of the training form so templates can pre-fill them.
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requiresIpp, setRequiresIpp] = useState(true);
  const [startTime, setStartTime] = useState('');
  const [month, setMonth] = useState(() => Number(londonToday().split('-')[1]));
  const [day, setDay] = useState(() => Number(londonToday().split('-')[2]));
  const [templateKey, setTemplateKey] = useState('');
  const [divisionId, setDivisionId] = useState('');

  // Role request: several roles can be ticked and sent in one go.
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [roleSearch, setRoleSearch] = useState('');
  const toggleRole = (key: string) =>
    setSelectedRoles((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  function applyTemplate(key: string) {
    const t = TRAINING_TEMPLATES.find((x) => x.key === key);
    if (!t) return;
    setTemplateKey(t.key);
    setTitle(t.title);
    setDescription(t.description);
    setRequiresIpp(t.requiresIpp);
    // Every template defaults to the Emergency Response team (still changeable).
    const ert = divisions.find((d) => /emergency response/i.test(d.name));
    if (ert) setDivisionId(ert.id);
  }

  // Year is preset (this year; next year if the chosen month has already passed).
  const [todayY, todayM, todayD] = londonToday().split('-').map(Number);
  const year = month < todayM ? todayY + 1 : todayY;
  const daysInMonth = new Date(year, month, 0).getDate();
  const safeDay = Math.min(day, daysInMonth);
  const dateValue = `${year}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function submit(e: React.FormEvent<HTMLFormElement>, action: (fd: FormData) => Promise<ActionResult>, reset: () => void) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const r = await action(fd);
      setResult(r);
      if (r.ok) {
        form.reset();
        reset();
      }
    });
  }

  const clearTraining = () => {
    setTemplateKey('');
    setDivisionId('');
    setTitle('');
    setDescription('');
    setStartTime('');
    setMonth(todayM);
    setDay(todayD);
    setRequiresIpp(true);
  };

  return (
    <main className="flex flex-col px-8 mt-6 max-w-[1450px] mx-auto w-full gap-6 pb-16 select-none antialiased">
      <div className="w-full bg-neutral-900 border border-neutral-800 p-6 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#5865F2]" />
        <div>
          <span className="text-[10px] font-mono text-[#5865F2] tracking-widest uppercase block mb-1">TRAINER PANEL</span>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-100">Trainer Panel</h2>
          <p className="text-xs text-neutral-400 mt-1">Post trainings from templates, bar people from a training{showRoles ? ' and manage role requests' : ''}.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('post')} className={`${btnClass} ${tab === 'post' ? '' : '!bg-neutral-800 hover:!bg-neutral-700'}`}>
            Post Training
          </button>
          {showRoles && (
            <button onClick={() => setTab('roles')} className={`${btnClass} ${tab === 'roles' ? '' : '!bg-neutral-800 hover:!bg-neutral-700'}`}>
              Role Requests
            </button>
          )}
          <button onClick={() => setTab('bars')} className={`${btnClass} ${tab === 'bars' ? '' : '!bg-neutral-800 hover:!bg-neutral-700'}`}>
            Training Bars
          </button>
          <Link href="/dashboard/trainings" className={`${btnClass} !bg-neutral-800 hover:!bg-neutral-700`}>
            View Trainings
          </Link>
        </div>
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

      {tab === 'post' && (
        <form onSubmit={(e) => submit(e, createTraining, clearTraining)} className="bg-neutral-900 border border-neutral-800 p-6 space-y-4">
          <input type="hidden" name="templateKey" value={templateKey} />
          <div>
            <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider mb-2">Templates</h3>
            <div className="flex flex-wrap gap-2">
              {TRAINING_TEMPLATES.map((t) => (
                <button
                  type="button"
                  key={t.key}
                  onClick={() => applyTemplate(t.key)}
                  className="px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-[11px] font-mono uppercase tracking-wider cursor-pointer"
                >
                  {t.name}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-neutral-500 mt-2">Pick a template, then choose the day and start time. Everything can still be edited.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Title</label>
              <input name="title" required maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Division (optional)</label>
              <select name="divisionId" value={divisionId} onChange={(e) => setDivisionId(e.target.value)} className={inputClass}>
                <option value="">General</option>
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Date (UK time)</label>
              <input type="hidden" name="date" value={dateValue} />
              <div className="grid grid-cols-3 gap-2">
                <div className={`${inputClass} text-neutral-400`}>{year}</div>
                <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={inputClass}>
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <select value={safeDay} onChange={(e) => setDay(Number(e.target.value))} className={inputClass}>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Start</label>
              <input type="time" name="startTime" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-neutral-400 mb-1">Details</label>
            <textarea name="description" rows={7} maxLength={1500} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-[11px] text-neutral-400 mb-1">Banner image URL (optional, https)</label>
            <input name="imageUrl" type="url" placeholder="https://..." className={inputClass} />
          </div>
          <label className="flex items-center gap-2 text-xs text-neutral-300">
            <input type="checkbox" name="requiresIpp" checked={requiresIpp} onChange={(e) => setRequiresIpp(e.target.checked)} />
            Only IPP + Advanced (trained driver) can attend
          </label>
          <label className="flex items-center gap-2 text-xs text-neutral-300">
            <input type="checkbox" name="ping" /> Ping the training role in Discord (silent 9pm-7am)
          </label>
          <button type="submit" disabled={pending} className={btnClass}>
            {pending ? 'Posting...' : 'Post to website & Discord'}
          </button>
        </form>
      )}

      {tab === 'roles' && showRoles && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {canRequestRoles && (
          <form onSubmit={(e) =>
              submit(
                e,
                (fd) => {
                  fd.delete('roleKey');
                  selectedRoles.forEach((k) => fd.append('roleKey', k));
                  return requestRole(fd);
                },
                () => {
                  setSelectedRoles([]);
                  setRoleSearch('');
                }
              )
            } className="bg-neutral-900 border border-neutral-800 p-6 space-y-4 lg:col-span-1">
            <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">Request a role</h3>
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Member Discord ID</label>
              <input name="target" required placeholder="e.g. 123456789012345678" className={inputClass} />
            </div>
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">
                Roles <span className="text-neutral-500">({selectedRoles.length} selected - tick as many as you need)</span>
              </label>
              <input
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                placeholder="Search roles..."
                className={`${inputClass} mb-2`}
              />
              {selectedRoles.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {selectedRoles.map((k) => (
                    <button
                      type="button"
                      key={k}
                      onClick={() => toggleRole(k)}
                      className="px-2 py-0.5 bg-[#5865F2]/20 border border-[#5865F2]/40 text-[10px] font-mono text-neutral-200 hover:bg-red-500/20 cursor-pointer"
                      title="Click to remove"
                    >
                      {ROLE_OPTIONS.find((o) => o.key === k)?.label ?? k} x
                    </button>
                  ))}
                </div>
              )}
              <div className="max-h-72 overflow-y-auto border border-neutral-800 bg-neutral-950 p-2 space-y-3">
                {ROLE_GROUPS.map((g) => {
                  const list = ROLE_OPTIONS.filter(
                    (r) => r.group === g && (!roleSearch.trim() || r.label.toLowerCase().includes(roleSearch.trim().toLowerCase()))
                  );
                  if (list.length === 0) return null;
                  return (
                    <div key={g}>
                      <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1">{g}</p>
                      {list.map((r) => (
                        <label key={r.key} className="flex items-center gap-2 py-0.5 text-xs text-neutral-300 cursor-pointer">
                          <input type="checkbox" checked={selectedRoles.includes(r.key)} onChange={() => toggleRole(r.key)} />
                          {r.label}
                        </label>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Reason / training passed</label>
              <textarea name="reason" required rows={4} maxLength={500} className={inputClass} />
            </div>
            <button type="submit" disabled={pending || selectedRoles.length === 0} className={btnClass}>
              {pending ? 'Sending...' : selectedRoles.length > 1 ? `Send ${selectedRoles.length} requests` : 'Send request'}
            </button>
            <p className="text-[11px] text-neutral-500">Silver or Gold Command approves or denies it. When approved, the bot gives the role on Discord automatically.</p>
          </form>
          )}

          <div className={`bg-neutral-900 border border-neutral-800 p-6 ${canRequestRoles ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider mb-4">Recent requests</h3>
            {requests.length === 0 ? (
              <p className="text-xs font-mono text-neutral-500">No role requests yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {requests.map((r) => (
                  <div key={r.id} className="bg-neutral-950 border border-neutral-800 p-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-neutral-300">
                      <span className="font-mono font-bold">{r.target_name || r.target_discord_id}</span>
                      <span className="text-neutral-500"> - </span>
                      {ROLE_OPTIONS.find((o) => o.key === r.role_key)?.label ?? r.role_key}
                      <span className="text-neutral-500"> (by {r.requested_by})</span>
                    </div>
                    {canReview && r.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          disabled={pending}
                          onClick={() => startTransition(async () => setResult(await decideRoleRequest(r.id, true)))}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-mono uppercase tracking-wider cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          disabled={pending}
                          onClick={() => startTransition(async () => setResult(await decideRoleRequest(r.id, false)))}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-[10px] font-mono uppercase tracking-wider cursor-pointer"
                        >
                          Deny
                        </button>
                      </div>
                    )}
                    <span
                      className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border ${
                        r.status === 'approved'
                          ? 'text-emerald-300 border-emerald-500/30'
                          : r.status === 'denied'
                          ? 'text-red-300 border-red-500/30'
                          : 'text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'bars' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <form onSubmit={(e) => submit(e, barFromTrainings, () => {})} className="bg-neutral-900 border border-neutral-800 p-6 space-y-4">
            <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">Bar from trainings</h3>
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Member's Discord ID</label>
              <input name="target" required placeholder="Right click them > Copy User ID" className={inputClass} />
            </div>
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Barred from which training</label>
              <select name="trainingKey" required defaultValue="" className={inputClass}>
                <option value="" disabled>
                  Choose a training...
                </option>
                {TRAINING_TEMPLATES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Reason</label>
              <textarea name="reason" required rows={4} maxLength={300} className={inputClass} />
            </div>
            <button type="submit" disabled={pending} className={btnClass}>
              {pending ? 'Saving...' : 'Bar from trainings'}
            </button>
            <p className="text-[11px] text-neutral-500">
              They can't book that training and are taken off any upcoming one they're booked on. The bar ends automatically when a new training of the same type is posted.
            </p>
          </form>

          <div className="bg-neutral-900 border border-neutral-800 p-6 lg:col-span-2">
            <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider mb-4">Currently barred</h3>
            {bars.length === 0 ? (
              <p className="text-xs font-mono text-neutral-500">Nobody is barred.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {bars.map((b) => (
                  <div key={b.id} className="bg-neutral-950 border border-neutral-800 p-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-neutral-300">
                      <span className="font-mono font-bold">{b.target_name || b.discord_id}</span>
                      <span className="text-neutral-500"> - </span>
                      {b.training_title || b.training_key}
                      <span className="text-neutral-500"> (by {b.barred_by})</span>
                      {b.reason && <div className="text-neutral-500 mt-1">{b.reason}</div>}
                    </div>
                    <button
                      disabled={pending}
                      onClick={() => startTransition(async () => setResult(await liftTrainingBar(b.id)))}
                      className="px-3 py-1 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50 text-[10px] font-mono uppercase tracking-wider cursor-pointer"
                    >
                      Lift bar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
