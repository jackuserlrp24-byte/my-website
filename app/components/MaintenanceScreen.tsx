import Image from 'next/image';

/** The "under maintenance" card. `fullPage` is used for the whole website, otherwise it sits inside the dashboard. */
export default function MaintenanceScreen({
  title,
  message,
  fullPage = false,
  devLogin = false,
  mode = 'maintenance',
}: {
  title: string;
  message: string;
  fullPage?: boolean;
  devLogin?: boolean;
  mode?: 'maintenance' | 'coming_soon';
}) {
  const soon = mode === 'coming_soon';
  const accentBg = soon ? 'bg-[#5865F2]' : 'bg-amber-500';
  const accentText = soon ? 'text-indigo-300' : 'text-amber-400';

  return (
    <main className={`flex items-center justify-center p-6 ${fullPage ? 'min-h-screen bg-neutral-950' : 'min-h-[60vh]'}`}>
      <div className="mt-card relative w-full max-w-lg bg-neutral-900 border border-neutral-800 p-10 text-center shadow-2xl overflow-hidden">
        <div className={`absolute top-0 left-0 right-0 h-1 ${accentBg}`} />

        <div className="relative w-14 h-14 mx-auto mb-5 rounded bg-neutral-800 border border-neutral-700 overflow-hidden">
          <Image src="/logo.png" alt="Logo" fill sizes="56px" className="object-cover" />
        </div>

        <span className={`inline-flex items-center gap-2 text-[10px] font-mono tracking-widest uppercase mb-2 ${accentText}`}>
          <span className="relative flex h-1.5 w-1.5" aria-hidden>
            <span className={`mt-ping absolute inline-flex h-full w-full rounded-full ${accentBg}`} />
            <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${accentBg}`} />
          </span>
          {soon ? 'Coming soon' : 'Under maintenance'}
        </span>

        <h1 className="text-xl font-bold tracking-tight text-neutral-100 mb-3">{title}</h1>
        <p className="text-sm text-neutral-400 leading-relaxed whitespace-pre-line select-text">{message}</p>

        {/* thin indeterminate bar: shows it is still working / waiting */}
        <div className="mt-track relative h-px w-full bg-neutral-800 overflow-hidden mt-7" aria-hidden>
          <span className={`absolute inset-y-0 left-0 w-2/5 ${accentBg}`} />
        </div>
        <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-wider mt-4">
          {soon ? 'This page updates automatically when it goes live.' : "This page refreshes automatically when we're back."}
        </p>

        {devLogin && (
          <a
            href="/api/auth/discord?next=/dashboard/developer"
            className="inline-block mt-6 text-[11px] font-mono uppercase tracking-wider text-neutral-500 hover:text-neutral-300 underline underline-offset-4"
          >
            Developer login
          </a>
        )}
      </div>
    </main>
  );
}
