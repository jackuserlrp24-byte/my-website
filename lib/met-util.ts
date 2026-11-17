// Small helpers shared by the officer portal pages.
export const when = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export const day = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${iso}T12:00:00Z`));

/** Readable reference such as INC-482913 / MG11-104772. Not secret, just easy to quote on the radio. */
export const makeRef = (prefix: string) => `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;

/** Trim a form value to a safe length. */
export const field = (fd: FormData, name: string, max = 500) => String(fd.get(name) ?? '').trim().slice(0, max);

/** Shared Tailwind classes so every page looks the same. */
export const ui = {
  h1: 'text-2xl font-bold text-slate-900',
  sub: 'text-sm text-slate-500 mt-1',
  card: 'border border-slate-200 rounded-lg p-4 bg-white',
  panel: 'border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50',
  label: 'block text-xs font-semibold text-slate-600 mb-1',
  input: 'w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#00247D]',
  btn: 'px-4 py-2 bg-[#00247D] hover:bg-[#001a5c] text-white text-sm font-semibold rounded-md cursor-pointer',
  btnGhost: 'px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded-md cursor-pointer',
  danger: 'text-xs font-semibold text-red-600 hover:text-red-800 cursor-pointer',
  empty: 'text-sm text-slate-500 border border-dashed border-slate-300 rounded-md px-4 py-10 text-center',
  warn: 'text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-4 py-3',
  th: 'px-4 py-3',
  eyebrow: 'text-xs font-bold uppercase tracking-widest text-slate-500',
  pill: 'text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border',
};
