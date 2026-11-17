import Image from 'next/image';

/** One little worker. Origin (0,0) is the middle of their feet; arms are passed in as children. */
function Worker({
  x,
  flip = false,
  skin,
  hat,
  vest,
  delay = 0,
  children,
}: {
  x: number;
  flip?: boolean;
  skin: string;
  hat: string;
  vest: string;
  delay?: number;
  children?: React.ReactNode;
}) {
  return (
    <g transform={`translate(${x} 93)`}>
      <g className="mt-face" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <g className="mt-bob" style={{ animationDelay: `${delay}s` }}>
        {/* legs + boots */}
        <rect x={-6} y={-14} width={5} height={14} rx={1.5} fill="#52525b" />
        <rect x={1} y={-14} width={5} height={14} rx={1.5} fill="#52525b" />
        <rect x={-7} y={-3} width={7} height={3} rx={1.5} fill="#3f3f46" />
        <rect x={0} y={-3} width={7} height={3} rx={1.5} fill="#3f3f46" />
        {/* hanging arm */}
        <line x1={-9} y1={-37} x2={-11} y2={-25} stroke={vest} strokeWidth={4} strokeLinecap="round" />
        <circle cx={-11} cy={-23} r={2} fill={skin} />
        {/* hi-vis vest */}
        <rect x={-9} y={-42} width={18} height={29} rx={4} fill={vest} />
        <rect x={-9} y={-30} width={18} height={3} fill="#f5f5f5" opacity={0.85} />
        {/* head */}
        <circle cy={-50} r={8} fill={skin} />
        <circle cx={-2} cy={-48.5} r={1} fill="#27272a" />
        <circle cx={3.5} cy={-48.5} r={1} fill="#27272a" />
        {/* hard hat */}
        <path d="M-9 -52 a9 9 0 0 1 18 0 z" fill={hat} />
        <rect x={-11} y={-53} width={22} height={3} rx={1.5} fill={hat} />
        <rect x={-1.2} y={-61} width={2.4} height={8} rx={1} fill="#000" opacity={0.12} />
        {children}
      </g>
      </g>
    </g>
  );
}

/** Three little workers in hard hats trying to fix things. Purely decorative. */
function Crew() {
  return (
    <svg viewBox="0 0 320 100" className="w-full max-w-[320px] h-auto mx-auto mt-6" aria-hidden>
      <defs>
        <clipPath id="mt-board-clip">
          <rect x={-12} y={-38} width={24} height={14} rx={1.5} />
        </clipPath>
      </defs>

      {/* ground */}
      <line x1={10} y1={93} x2={310} y2={93} stroke="#404040" strokeWidth={1} />

      {/* sign being nailed */}
      <g transform="translate(116 93)">
        <rect x={-1.5} y={-40} width={3} height={40} fill="#a16207" />
        <g transform="rotate(-6 0 -31)">
          <rect x={-12} y={-38} width={24} height={14} rx={1.5} fill="#fbbf24" />
          <g clipPath="url(#mt-board-clip)" stroke="#1c1917" strokeWidth={3}>
            <path d="M-12 -24 l8 -14 M-4 -24 l8 -14 M4 -24 l8 -14 M12 -24 l8 -14" />
          </g>
        </g>
      </g>

      {/* machine being repaired */}
      <g transform="translate(196 93)">
        <rect x={0} y={-37} width={28} height={37} rx={3} fill="#3f3f46" stroke="#52525b" />
        <path d="M5 -20h18M5 -13h18M5 -6h18" stroke="#27272a" strokeWidth={2} strokeLinecap="round" />
        <circle cx={7} cy={-30} r={2} fill="#f59e0b" className="mt-led" />
        <circle cx={14} cy={-30} r={2} fill="#22c55e" />
      </g>

      {/* traffic cone */}
      <g>
        <path d="M290 91 L298 65 L306 91 Z" fill="#f97316" />
        <path d="M294.3 77 H301.7 L303.2 83 H292.8 Z" fill="#f5f5f5" />
        <rect x={288.5} y={90} width={19} height={3} rx={1.5} fill="#c2410c" />
      </g>

      {/* worker 1: hammering the sign */}
      <g className="mt-walk mt-walk-3"><Worker x={70} skin="#f1c9a5" hat="#facc15" vest="#f97316">
        <g transform="translate(9 -38)">
          <g className="mt-hammer">
            <line x1={0} y1={0} x2={12} y2={0} stroke="#f97316" strokeWidth={4} strokeLinecap="round" />
            <line x1={12} y1={0} x2={26} y2={0} stroke="#a16207" strokeWidth={2.5} strokeLinecap="round" />
            <rect x={22} y={-5} width={7} height={10} rx={1} fill="#9ca3af" />
          </g>
        </g>
      </Worker></g>
      <g transform="translate(104 61)">
        <g className="mt-spark" opacity={0}>
          <path d="M0 -6v-5M5 -4l4 -4M6 1h5M5 6l4 4" stroke="#fde68a" strokeWidth={1.5} strokeLinecap="round" />
        </g>
      </g>

      {/* worker 2: wrench on the machine */}
      <g className="mt-walk mt-walk-2"><Worker x={176} skin="#b9825b" hat="#fb923c" vest="#a3e635" delay={0.4}>
        <g transform="translate(9 -38)">
          <g className="mt-wrench">
            <line x1={0} y1={0} x2={11} y2={0} stroke="#a3e635" strokeWidth={4} strokeLinecap="round" />
            <line x1={11} y1={0} x2={19} y2={0} stroke="#d4d4d8" strokeWidth={2.5} strokeLinecap="round" />
            <circle cx={21} cy={0} r={3} fill="none" stroke="#d4d4d8" strokeWidth={2} />
          </g>
        </g>
      </Worker></g>

      {/* worker 3: scratching their head */}
      <g className="mt-walk mt-walk-1"><Worker x={262} flip skin="#8a5a3c" hat="#f5f5f5" vest="#f97316" delay={0.8}>
        <g transform="translate(9 -38)">
          <g className="mt-scratch">
            <line x1={0} y1={0} x2={11} y2={0} stroke="#f97316" strokeWidth={4} strokeLinecap="round" />
            <circle cx={12.5} cy={0} r={2.5} fill="#8a5a3c" />
          </g>
        </g>
      </Worker></g>
      <g fill="#737373" className="mt-thoughts">
        <circle cx={250} cy={30} r={1.6} className="mt-think" style={{ animationDelay: '0s' }} />
        <circle cx={256} cy={26} r={1.6} className="mt-think" style={{ animationDelay: '0.3s' }} />
        <circle cx={263} cy={23} r={1.6} className="mt-think" style={{ animationDelay: '0.6s' }} />
      </g>
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
  const accentBg = soon ? 'bg-[#5865F2]' : 'bg-amber-500';
  const accentText = soon ? 'text-indigo-300' : 'text-amber-400';

  return (
    <main className={`flex items-center justify-center p-6 ${fullPage ? 'min-h-screen bg-neutral-950' : 'min-h-[60vh]'}`}>
      <div className="mt-card relative w-full max-w-lg bg-neutral-900 border border-neutral-800 p-10 text-center shadow-2xl overflow-hidden">
        <div className={`absolute top-0 left-0 right-0 h-1 ${accentBg}`} />

        <div className="relative w-14 h-14 mx-auto mb-5 rounded bg-neutral-800 border border-neutral-700 overflow-hidden">
          <Image src="/logo.png" alt="Logo" fill sizes="56px" className="object-cover" />
        </div>

        <span className={`block text-[10px] font-mono tracking-widest uppercase mb-2 ${accentText}`}>
          {soon ? 'Coming soon' : 'Under maintenance'}
        </span>

        <h1 className="text-xl font-bold tracking-tight text-neutral-100 mb-3">{title}</h1>
        <p className="text-sm text-neutral-400 leading-relaxed whitespace-pre-line select-text">{message}</p>

        {!soon && <Crew />}

        {/* thin indeterminate bar: shows it is still working / waiting */}
        <div className="mt-track relative h-px w-full bg-neutral-800 overflow-hidden mt-5" aria-hidden>
          <span className={`absolute inset-y-0 left-0 w-2/5 ${accentBg}`} />
        </div>
        <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-wider mt-4">
          <span className="mt-wait">
            {soon ? 'This page updates automatically when it goes live.' : "This page refreshes automatically when we're back."}
          </span>
          <span className="mt-back">{soon ? "It's live." : "We're back."}</span>
        </p>

        {devLogin && (
          <a
            href="/api/auth/discord?next=/developer"
            className="inline-block mt-6 text-[11px] font-mono uppercase tracking-wider text-neutral-500 hover:text-neutral-300 underline underline-offset-4"
          >
            Developer login
          </a>
        )}
      </div>
    </main>
  );
}
