import Link from 'next/link';
import { getOfficer, canManageMet, hasCommandRank } from '@/lib/met-access';
import { supabaseAdmin } from '@/lib/portal';
import { londonToday } from '@/lib/london-time';
import { ui, when } from '@/lib/met-util';
import { setAvailability } from './actions';

export const dynamic = 'force-dynamic';

const LABEL: Record<string, string> = { on_duty: 'On duty', off_duty: 'Off duty', unavailable: 'Unavailable' };
const STYLE: Record<string, string> = {
  on_duty: 'text-emerald-700 border-emerald-200 bg-emerald-50',
  off_duty: 'text-slate-600 border-slate-200 bg-slate-50',
  unavailable: 'text-amber-700 border-amber-200 bg-amber-50',
};
const LOA_LABEL: Record<string, string> = { active: 'on leave', approved: 'scheduled', declined: 'declined', ended: 'ended', cancelled: 'ended early' };

export default async function DutyPage() {
  const officer = (await getOfficer())!;
  const manager = canManageMet(officer);
  const today = londonToday();

  const [mine, onDuty, loas] = await Promise.all([
    supabaseAdmin.from('met_duty_status').select('status, note, updated_at').eq('discord_id', officer.id).maybeSingle(),
    supabaseAdmin.from('met_duty_status').select('discord_id, name, note').eq('status', 'on_duty').order('name', { ascending: true }).limit(200),
    supabaseAdmin.from('loa_requests').select('id, start_date, end_date, status, decision_note').eq('discord_id', officer.id).order('created_at', { ascending: false }).limit(8),
  ]);

  const status = mine.data?.status ?? 'off_duty';
  const activeLoa = (loas.data ?? []).find((l) => l.status === 'active' && l.start_date <= today && l.end_date >= today);
  const onDutyRows = onDuty.data ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className={ui.h1}>Duty</h1>
        <p className={ui.sub}>Set your availability and keep track of your leave requests.</p>
      </div>

      {mine.error && <p className={ui.warn}>Duty is not set up yet. Run supabase/met-portal.sql in Supabase.</p>}

      {/* Availability */}
      <section className="space-y-3">
        <h2 className={ui.eyebrow}>Availability</h2>
        <div className={`${ui.card} space-y-3`}>
          <div className="flex items-center gap-3">
            <span className={`${ui.pill} ${STYLE[status]}`}>{LABEL[status]}</span>
            {activeLoa && <span className={`${ui.pill} text-sky-700 border-sky-200 bg-sky-50`}>On LOA until {activeLoa.end_date}</span>}
            {mine.data?.updated_at && <span className="text-xs text-slate-400">Updated {when(mine.data.updated_at)}</span>}
          </div>
          <form action={setAvailability} className="flex flex-wrap gap-2 items-end">
            <div>
              <label className={ui.label}>Status</label>
              <select name="status" defaultValue={status} className={ui.input}>
                <option value="on_duty">On duty</option>
                <option value="off_duty">Off duty</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>
            <div className="flex-1 min-w-[12rem]">
              <label className={ui.label}>Note (optional)</label>
              <input name="note" maxLength={140} defaultValue={mine.data?.note ?? ''} placeholder="e.g. Response car 12" className={ui.input} />
            </div>
            <button type="submit" className={ui.btn}>Update</button>
          </form>
        </div>
      </section>

      {/* Who is on duty */}
      <section className="space-y-3">
        <h2 className={ui.eyebrow}>On duty now ({onDutyRows.length})</h2>
        {onDutyRows.length === 0 ? (
          <p className="text-xs text-slate-400">Nobody has set themselves on duty.</p>
        ) : manager ? (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {onDutyRows.map((o) => (
              <li key={o.discord_id} className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800">
                {o.name || 'Officer'}
                {o.note && <span className="text-slate-400"> · {o.note}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">{onDutyRows.length} officer{onDutyRows.length === 1 ? '' : 's'} on duty.</p>
        )}
      </section>

      {/* Leave requests */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className={ui.eyebrow}>Leave requests</h2>
          {officer.isCommand && (
            <Link href="/dashboard/command/loa" className="text-xs font-semibold text-[#00247D] hover:underline">
              Request leave / open LOA &rarr;
            </Link>
          )}
        </div>
        {(loas.data ?? []).length === 0 ? (
          <p className="text-xs text-slate-400">No leave requests.</p>
        ) : (
          <ul className="space-y-2">
            {(loas.data ?? []).map((l) => (
              <li key={l.id} className="border border-slate-200 rounded-md px-3 py-2 text-sm flex items-center justify-between gap-3">
                <span className="text-slate-800">
                  {l.start_date} &rarr; {l.end_date}
                  {l.status === 'declined' && l.decision_note && <span className="block text-xs text-red-600">{l.decision_note}</span>}
                </span>
                <span className={`${ui.pill} text-slate-600 border-slate-200`}>{LOA_LABEL[l.status] ?? l.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* The rota lives on the LOA page and is only linked for command rank. */}
      {hasCommandRank(officer) && (
        <p className="text-sm text-slate-500">
          The duty rota is on the <Link href="/dashboard/command/loa" className="text-[#00247D] font-semibold hover:underline">Leave of Absence</Link> page.
        </p>
      )}
    </div>
  );
}
