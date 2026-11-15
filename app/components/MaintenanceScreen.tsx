import Image from 'next/image';

/** Two interlocking gears that turn - the "under maintenance" icon. */
function Gears() {
  return (
    <svg viewBox="0 0 64 48" className="w-16 h-12 text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <g className="mt-spin" style={{ transformBox: 'fill-box' }}>
        <circle cx="22" cy="26" r="6" />
        <path d="M22 11v5M22 36v5M7 26h5M32 26h5M11.4 15.4l3.5 3.5M29.1 33.1l3.5 3.5M11.4 36.6l3.5-3.5M29.1 18.9l3.5-3.5" />
      </g>
      <g className="mt-spin-rev" style={{ transformBox: 'fill-box' }}>
        <circle cx="47" cy="17" r="4" />
        <path d="M47 7v3M47 24v3M37 17h3M54 17h3M39.9 9.9l2.1 2.1M52 22l2.1 2.1M39.9 24.1l2.1-2.1M52 12l2.1-2.1" />
      </g>
    </svg>
  );
}

/** A pulsing sparkle - the "coming soon" icon. */
function Sparkle() {
  return (
    <svg viewBox="0 0 48 48" className="w-12 h-12 text-indigo-300" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path className="mt-glow" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} d="M24 6l4 12 12 4-12 4-4 12-4-12-12-4 12-4 4-12z" />
      <path className="mt-glow" style={{ transformBox: 'fill-box', transformOrigin: 'center', animationDelay: '0.8s' }} d="M38 30l1.6 4.4L44 36l-4.4 1.6L38 42l-1.6-4.4L32 36l4.4-1.6L38 30z" />
    </svg>
  );
}

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
  const accent = soon ? 'bg-indigo-400' : 'bg-amber-400';
  const delay = (ms: number) => ({ animationDelay: `${ms}ms` });

  return (
    <main className={`relative flex items-center justify-center p-6 overflow-hidden ${fullPage ? 'min-h-screen bg-neutral-950' : 'min-h-[60vh]'}`}>
      {/* animated backdrop */}
      <div className="mt-bg-grid absolute inset-0 pointer-events-none" aria-hidden />
      <div
        className={`mt-glow absolute w-[28rem] h-[28rem] rounded-full blur-3xl pointer-events-none ${soon ? 'bg-indigo-500/20' : 'bg-amber-500/15'}`}
        aria-hidden
      />

      <div className="mt-card relative w-full max-w-lg bg-neutral-900 border border-neutral-800 p-10 text-center shadow-2xl">
        <div className={`absolute top-0 left-0 right-0 h-1.5 ${soon ? 'mt-bar-soon' : 'mt-bar-maint'}`} />

        <div className="mt-rise relative w-14 h-14 mx-auto mb-5" style={delay(150)}>
          <div className={`mt-glow absolute -inset-2 rounded-full blur-md ${soon ? 'bg-indigo-500/30' : 'bg-amber-500/30'}`} aria-hidden />
          <div className="mt-float relative w-14 h-14 rounded bg-neutral-800 border border-neutral-700 overflow-hidden">
            <Image src="/logo.png" alt="Logo" fill sizes="56px" className="object-cover" />
          </div>
        </div>

        <div className="mt-rise flex justify-center mb-3" style={delay(250)}>
          {soon ? <Sparkle /> : <Gears />}
        </div>

        <span
          className={`mt-rise inline-flex items-center gap-2 text-[10px] font-mono tracking-widest uppercase mb-2 ${soon ? 'text-indigo-300' : 'text-amber-400'}`}
          style={delay(350)}
        >
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className={`mt-ping absolute inline-flex h-full w-full rounded-full ${accent}`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${accent}`} />
          </span>
          {soon ? 'Coming soon' : 'Under maintenance'}
        </span>

        <h1 className="mt-rise text-xl font-bold tracking-tight text-neutral-100 mb-3" style={delay(450)}>
          {title}
        </h1>
        <p className="mt-rise text-sm text-neutral-400 leading-relaxed whitespace-pre-line select-text" style={delay(550)}>
          {message}
        </p>

        <p className="mt-rise flex items-center justify-center gap-2 text-[10px] font-mono text-neutral-600 uppercase tracking-wider mt-5" style={delay(650)}>
          <span className="inline-flex gap-1" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span key={i} className={`mt-dot h-1 w-1 rounded-full ${accent}`} style={delay(i * 200)} />
            ))}
          </span>
          {soon ? 'This page updates automatically when it goes live.' : "This page refreshes automatically when we're back."}
        </p>

        {devLogin && (
          <a
            href="/api/auth/discord?next=/dashboard/developer"
            className="mt-rise inline-block mt-7 text-[11px] font-mono uppercase tracking-wider text-neutral-500 hover:text-neutral-300 underline underline-offset-4"
            style={delay(750)}
          >
            Developer login
          </a>
        )}
      </div>
    </main>
  );
}
