'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { NoticeItem } from '@/lib/met-notifications';

const KEY = 'met-notices-seen';

const ago = (iso: string) => {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
};

const TYPE_STYLE: Record<NoticeItem['type'], string> = {
  message: 'text-sky-700 border-sky-200 bg-sky-50',
  notice: 'text-slate-600 border-slate-200 bg-slate-50',
  bulletin: 'text-purple-700 border-purple-200 bg-purple-50',
};

export default function NotificationBell() {
  const path = usePathname();
  const [items, setItems] = useState<NoticeItem[]>([]);
  const [seen, setSeen] = useState<number | null>(null); // time the panel was last opened (this browser)
  const [highlightBefore, setHighlightBefore] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/met-notifications', { cache: 'no-store' });
      if (res.ok) setItems(((await res.json()) as { items: NoticeItem[] }).items);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      setSeen(Number(localStorage.getItem(KEY) || 0));
    } catch {
      setSeen(0);
    }
  }, []);

  // Refresh on every page change and once a minute.
  useEffect(() => {
    load();
  }, [load, path]);
  useEffect(() => {
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const isNew = (i: NoticeItem, since: number) => i.type === 'message' || new Date(i.created_at).getTime() > since;
  const count = seen === null ? items.filter((i) => i.type === 'message').length : items.filter((i) => isNew(i, seen)).length;

  const toggle = () => {
    if (!open) {
      setHighlightBefore(seen ?? 0);
      const now = Date.now();
      setSeen(now);
      try {
        localStorage.setItem(KEY, String(now));
      } catch {}
      load();
    }
    setOpen(!open);
  };

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={`Notifications${count ? `, ${count} new` : ''}`}
        className="relative h-9 w-9 flex items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 md:left-auto md:right-0 top-full mt-2 w-80 max-w-[85vw] z-50 bg-white border border-slate-200 rounded-lg shadow-xl">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Notifications</p>
            <Link href="/met-police/communications" onClick={() => setOpen(false)} className="text-xs font-semibold text-[#00247D] hover:underline">
              Open Communications
            </Link>
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-sm text-slate-500 text-center">You are all caught up.</p>
            ) : (
              items.map((i) => (
                <Link
                  key={i.id}
                  href={i.href}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-3 hover:bg-slate-50 ${isNew(i, highlightBefore) ? 'bg-blue-50/50' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${TYPE_STYLE[i.type]}`}>
                      {i.type === 'message' ? 'Message' : i.type === 'bulletin' ? 'Bulletin' : 'Notice'}
                    </span>
                    <span className="text-[11px] text-slate-400">{ago(i.created_at)}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-900 line-clamp-2">{i.title}</p>
                  <p className="text-xs text-slate-500">{i.meta}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
