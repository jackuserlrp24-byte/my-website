import Image from 'next/image';
import Link from 'next/link';

/**
 * Light page frame for the Staff and Developer panels (same idea as the Services Hub): no dashboard navigation,
 * slideshow background or per-page dashboard lookups, so these pages open quickly. Opens in its own browser tab.
 */
export default function StandaloneShell({
  title,
  accent = 'text-neutral-300',
  backHref,
  children,
}: {
  title: string;
  accent?: string;
  /** Link back to the portal. Leave out for accounts that can only see this one panel. */
  backHref?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex flex-col bg-neutral-950 text-neutral-100 antialiased select-none">
      <header className="flex items-center justify-between px-6 sm:px-10 py-4 border-b border-neutral-800 bg-neutral-900/80 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded bg-neutral-800 border border-neutral-700 overflow-hidden">
            <Image src="/logo.png" alt="Central Operations" fill sizes="36px" className="object-cover" />
          </div>
          <span className="text-xs font-semibold tracking-widest uppercase text-neutral-300">Central Operations</span>
          <span className="text-neutral-700">/</span>
          <span className={`text-xs font-semibold tracking-widest uppercase ${accent}`}>{title}</span>
        </div>
        {backHref && (
          <Link
            href={backHref}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold tracking-wider uppercase transition-colors"
          >
            Back to Portal
          </Link>
        )}
      </header>
      <main className="flex-1 flex flex-col pb-12">{children}</main>
      <footer className="px-6 sm:px-10 py-3 border-t border-neutral-800 text-[11px] font-mono text-neutral-500 text-center">
        &copy; Central Operations. All rights reserved.
      </footer>
    </div>
  );
}
