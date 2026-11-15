import Image from 'next/image';

/** The "under maintenance" card. `fullPage` is used for the whole website, otherwise it sits inside the dashboard. */
export default function MaintenanceScreen({
  title,
  message,
  fullPage = false,
  devLogin = false,
}: {
  title: string;
  message: string;
  fullPage?: boolean;
  devLogin?: boolean;
}) {
  return (
    <main className={`flex items-center justify-center p-6 ${fullPage ? 'min-h-screen bg-neutral-950' : 'min-h-[60vh]'}`}>
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 p-10 text-center shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
        <div className="relative w-14 h-14 mx-auto mb-5 rounded bg-neutral-800 border border-neutral-700 overflow-hidden">
          <Image src="/logo.png" alt="Logo" fill sizes="56px" className="object-cover" />
        </div>
        <span className="text-[10px] font-mono text-amber-400 tracking-widest uppercase block mb-2">Under maintenance</span>
        <h1 className="text-xl font-bold tracking-tight text-neutral-100 mb-3">{title}</h1>
        <p className="text-sm text-neutral-400 leading-relaxed whitespace-pre-line select-text">{message}</p>
        {devLogin && (
          <a
            href="/api/auth/discord?next=/dashboard/developer"
            className="inline-block mt-7 text-[11px] font-mono uppercase tracking-wider text-neutral-500 hover:text-neutral-300 underline underline-offset-4"
          >
            Developer login
          </a>
        )}
      </div>
    </main>
  );
}
