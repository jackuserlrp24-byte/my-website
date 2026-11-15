'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import type { ActionResult, Division, RoleRequest } from '@/lib/portal-types';
import { REQUESTABLE_ROLES } from '@/lib/training-config';
import { TRAINING_TEMPLATES } from '@/lib/training-templates';
import { createTraining } from '@/app/dashboard/trainings/actions';
import { decideRoleRequest, requestRole } from './actions';

const inputClass =
  'w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2]';
const btnClass =
  'px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] disabled:opacity-50 text-white text-xs font-mono font-medium uppercase tracking-wider cursor-pointer';

const ROLE_OPTIONS = REQUESTABLE_ROLES.map(({ key, label, group }) => ({ key, label, group }));
const ROLE_GROUPS = Array.from(new Set(ROLE_OPTIONS.map((r) => r.group)));

const addMinutes = (time: string, mins: number) => {
  const [h, m] = time.split(':').map(Number);
  const total = (h * 60 + m + mins) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

export default function TrainerClient({
  divisions,
  requests,
  canRequestRoles,
  canReview,
}: {
  divisions: Division[];
  requests: RoleRequest[];
  canRequestRoles: boolean;
  canReview: boolean;
}) {
  const showRoles = canRequestRoles || canReview;
  const [tab, setTab] = useState<'post' | 'roles'>('post');
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  // Controlled bits of the training form so templates can pre-fill them.
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requiresIpp, setRequiresIpp] = useState(true);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [duration, setDuration] = useState<number | null>(null);

  function applyTemplate(key: string) {
    const t = TRAINING_TEMPLATES.find((x) => x.key === key);
    if (!t) return;
    setTitle(t.title);
    setDescription(t.description);
    setRequiresIpp(t.requiresIpp);
    setDuration(t.durationMins);
    if (startTime) setEndTime(addMinutes(startTime, t.durationMins));
  }

  function onStartChange(v: string) {
    setStartTime(v);
    if (duration && v) setEndTime(addMinutes(v, duration));
  }

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
    setTitle('');
    setDescription('');
    setStartTime('');
    setEndTime('');
    setDuration(null);
    setRequiresIpp(true);
  };

  return (
    <main className="flex flex-col px-8 mt-6 max-w-[1450px] mx-auto w-full gap-6 pb-16 select-none antialiased">
      <div className="w-full bg-neutral-900 border border-neutral-800 p-6 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#5865F2]" />
        <div>
          <span className="text-[10px] font-mono text-[#5865F2] tracking-widest uppercase block mb-1">TRAINER PANEL</span>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-100">Trainer Panel</h2>
          <p className="text-xs text-neutral-400 mt-1">Post trainings from templates{showRoles ? ' and manage role requests' : ''}.</p>
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
            <p className="text-[11px] text-neutral-500 mt-2">Pick a template, then choose the date and start time. Everything can still be edited.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Title</label>
              <input name="title" required maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Division (optional)</label>
              <select name="divisionId" defaultValue="" className={inputClass}>
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
              <input type="date" name="date" required className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Start</label>
                <input type="time" name="startTime" required value={startTime} onChange={(e) => onStartChange(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">End</label>
                <input type="time" name="endTime" required value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClass} />
              </div>
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
            <input type="checkbox" name="ping" /> Ping @everyone in Discord
          </label>
          <button type="submit" disabled={pending} className={btnClass}>
            {pending ? 'Posting...' : 'Post to website & Discord'}
          </button>
        </form>
      )}

      {tab === 'roles' && showRoles && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {canRequestRoles && (
          <form onSubmit={(e) => submit(e, requestRole, () => {})} className="bg-neutral-900 border border-neutral-800 p-6 space-y-4 lg:col-span-1">
            <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">Request a role</h3>
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Member Discord ID</label>
              <input name="target" required placeholder="e.g. 123456789012345678" className={inputClass} />
            </div>
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Role</label>
              <select name="roleKey" defaultValue="ipp" className={inputClass}>
                {ROLE_GROUPS.map((g) => (
                  <optgroup key={g} label={g}>
                    {ROLE_OPTIONS.filter((r) => r.group === g).map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Reason / training passed</label>
              <textarea name="reason" required rows={4} maxLength={500} className={inputClass} />
            </div>
            <button type="submit" disabled={pending} className={btnClass}>
              {pending ? 'Sending...' : 'Send request'}
            </button>
            <p className="text-[11px] text-neutral-500">Gold Command approves or denies it. When approved, the bot gives the role on Discord automatically.</p>
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
    </main>
  );
}
