'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { Division, Training } from '@/lib/portal-types';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

function state(t: Training): 'UPCOMING' | 'ACTIVE' | 'CONCLUDED' | 'CANCELLED' {
  if (t.cancelled_at) return 'CANCELLED';
  const now = Date.now();
  if (now > new Date(t.ends_at).getTime()) return 'CONCLUDED';
  if (now >= new Date(t.starts_at).getTime()) return 'ACTIVE';
  return 'UPCOMING';
}

const chipStyle = {
  UPCOMING: 'bg-[#5865F2]/20 border-[#5865F2]/50 text-indigo-200',
  ACTIVE: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200',
  CONCLUDED: 'bg-neutral-800 border-neutral-700 text-neutral-500',
  CANCELLED: 'bg-red-500/10 border-red-500/40 text-red-300 line-through',
} as const;

export default function CalendarClient({ trainings, divisions, loadError }: { trainings: Training[]; divisions: Pick<Division, 'id' | 'name'>[]; loadError: string | null }) {
  // Dates are worked out in the viewer's own timezone, so start null and fill in after mount.
  const [cursor, setCursor] = useState<Date | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelected(key(now));
  }, []);

  const byDay = useMemo(() => {
    const map = new Map<string, Training[]>();
    for (const t of trainings) {
      const k = key(new Date(t.starts_at));
      map.set(k, [...(map.get(k) ?? []), t]);
    }
    return map;
  }, [trainings]);

  const divName = (id: string | null) => divisions.find((d) => d.id === id)?.name ?? 'General';

  if (!cursor) return <main className="px-8 mt-6 max-w-[1450px] mx-auto w-full text-xs text-neutral-500 font-mono">Loading calendar...</main>;

  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = Math.ceil((lead + daysInMonth) / 7) * 7;
  const todayKey = key(new Date());
  const monthLabel = cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const shift = (n: number) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));
  const goToday = () => {
    const now = new Date();
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelected(todayKey);
  };

  const dayList = selected ? byDay.get(selected) ?? [] : [];
  const upcoming = trainings.filter((t) => state(t) === 'UPCOMING' || state(t) === 'ACTIVE').slice(0, 5);
  const btn = 'px-3 py-1.5 border border-neutral-700 hover:bg-neutral-800 text-neutral-300 text-[11px] font-mono uppercase tracking-wider cursor-pointer';

  return (
    <main className="flex flex-col px-8 mt-6 max-w-[1450px] mx-auto w-full gap-6 pb-16 select-none antialiased">
      <div className="w-full bg-neutral-900 border border-neutral-800 p-6 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#5865F2]" />
        <div>
          <span className="text-[10px] font-mono text-[#5865F2] tracking-widest uppercase block mb-1">SCHEDULE</span>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-100">Training Calendar</h2>
          <p className="text-xs text-neutral-400 mt-1">Every scheduled training at a glance. Times are shown in your local time.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/trainings" className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] text-white text-[11px] font-semibold uppercase tracking-wider">Attend a training</Link>
          <Link href="/dashboard" className={btn}>Back</Link>
        </div>
      </div>

      {loadError && <div className="border border-red-500/30 bg-red-500/10 text-red-300 text-xs font-mono p-4">{loadError}</div>}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Month grid */}
        <section className="lg:col-span-2 bg-neutral-900/90 border border-neutral-800 backdrop-blur-md">
          <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800">
            <h3 className="text-sm font-bold text-neutral-100 tracking-wide">{monthLabel}</h3>
            <div className="flex gap-1.5">
              <button onClick={() => shift(-1)} className={btn} aria-label="Previous month">‹</button>
              <button onClick={goToday} className={btn}>Today</button>
              <button onClick={() => shift(1)} className={btn} aria-label="Next month">›</button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-neutral-800">
            {DAYS.map((d) => (
              <div key={d} className="text-center py-2 text-[10px] font-mono uppercase tracking-wider text-neutral-500">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {Array.from({ length: cells }, (_, i) => {
              const dayNum = i - lead + 1;
              if (dayNum < 1 || dayNum > daysInMonth) return <div key={i} className="min-h-[92px] border-b border-r border-neutral-900 bg-neutral-950/40" />;
              const date = new Date(cursor.getFullYear(), cursor.getMonth(), dayNum);
              const k = key(date);
              const list = byDay.get(k) ?? [];
              const isToday = k === todayKey;
              const isSel = k === selected;
              return (
                <button
                  key={i}
                  onClick={() => setSelected(k)}
                  className={`min-h-[92px] text-left p-1.5 border-b border-r border-neutral-900 cursor-pointer transition-colors flex flex-col gap-1 ${
                    isSel ? 'bg-[#5865F2]/10 outline outline-1 outline-[#5865F2] -outline-offset-1' : 'hover:bg-neutral-800/50'
                  }`}
                >
                  <span className={`text-[11px] font-mono w-5 h-5 flex items-center justify-center ${isToday ? 'bg-[#5865F2] text-white rounded-full font-bold' : 'text-neutral-400'}`}>{dayNum}</span>
                  {list.slice(0, 2).map((t) => (
                    <span key={t.id} className={`block truncate border px-1 py-0.5 text-[9px] font-mono leading-tight ${chipStyle[state(t)]}`}>
                      {time(t.starts_at)} {t.title}
                    </span>
                  ))}
                  {list.length > 2 && <span className="text-[9px] font-mono text-neutral-500">+{list.length - 2} more</span>}
                </button>
              );
            })}
          </div>
        </section>

        {/* Side: selected day + next up */}
        <div className="flex flex-col gap-6">
          <section className="bg-neutral-900/90 border border-neutral-800 backdrop-blur-md">
            <div className="px-5 py-3 border-b border-neutral-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-100">
                {selected ? new Date(`${selected}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Pick a day'}
              </h3>
            </div>
            <div className="p-4 space-y-3 max-h-[420px] overflow-y-auto">
              {dayList.length === 0 && <p className="text-xs text-neutral-500 italic text-center py-6">No trainings on this day.</p>}
              {dayList.map((t) => {
                const st = state(t);
                const delayed = (t.delayed_minutes ?? 0) > 0;
                return (
                  <div key={t.id} className="bg-neutral-950/80 border border-neutral-800 p-3.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-neutral-100">{t.title}</h4>
                      <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 border shrink-0 ${chipStyle[st]}`}>{delayed && st === 'UPCOMING' ? 'DELAYED' : st}</span>
                    </div>
                    <p className="text-[11px] text-neutral-300 font-mono">
                      {time(t.starts_at)} - {time(t.ends_at)}
                      {delayed && <span className="text-amber-400"> (+{t.delayed_minutes} min)</span>}
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      {divName(t.division_id)} · Host: {t.host || 'TBD'} · {t.attending.length} attending
                    </p>
                    {t.requires_ipp && <p className="text-[10px] font-mono text-amber-400/80 uppercase">IPP + Advanced only</p>}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="bg-neutral-900/90 border border-neutral-800 backdrop-blur-md">
            <div className="px-5 py-3 border-b border-neutral-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-100">Coming up</h3>
            </div>
            <div className="divide-y divide-neutral-800">
              {upcoming.length === 0 && <p className="text-xs text-neutral-500 italic text-center py-6">Nothing scheduled.</p>}
              {upcoming.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    const d = new Date(t.starts_at);
                    setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
                    setSelected(key(d));
                  }}
                  className="w-full text-left px-5 py-3 hover:bg-neutral-800/50 cursor-pointer"
                >
                  <p className="text-xs font-semibold text-neutral-200 truncate">{t.title}</p>
                  <p className="text-[10px] font-mono text-neutral-500 mt-0.5">
                    {new Date(t.starts_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · {time(t.starts_at)}
                  </p>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
