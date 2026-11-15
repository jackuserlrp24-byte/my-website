import { cookies } from 'next/headers';
import Image from 'next/image';
import { supabaseAdmin } from '@/lib/portal';
import { parseSessionCookie, SESSION_COOKIE } from '@/lib/discord-auth';
import AppealForm from './AppealForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ban Appeal - Central Operations' };

export default async function AppealPage() {
  const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE)?.value);

  let latest: { status: string; review_note: string | null; created_at: string; reviewed_at: string | null; reviewed_by: string | null; invite_url?: string | null } | null = null;
  if (session) {
    const { data } = await supabaseAdmin
      .from('ban_appeals')
      .select('*') // * so the page still works before the invite_url column exists
      .eq('discord_id', session.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    latest = data;
  }

  return (
    <main className="relative min-h-screen w-full bg-neutral-950 text-neutral-100 flex items-center justify-center p-4 antialiased">
      <div className="relative z-10 w-full max-w-xl bg-neutral-900 border border-neutral-800 p-8 shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#5865F2]" />
        <div className="flex items-center gap-3 pb-5 mb-5 border-b border-neutral-800">
          <div className="relative w-10 h-10 rounded bg-neutral-800 border border-neutral-700 overflow-hidden shrink-0">
            <Image src="/logo.png" alt="Logo" fill sizes="40px" className="object-cover" />
          </div>
          <div>
            <h2 className="text-[11px] font-mono tracking-widest uppercase text-neutral-400">Central Operations</h2>
            <h1 className="text-xl font-bold tracking-wider uppercase">Ban Appeal</h1>
          </div>
        </div>

        {!session ? (
          <div className="space-y-4 text-center py-4">
            <p className="text-xs text-neutral-400 font-mono uppercase tracking-wider leading-relaxed">
              Log in with the Discord account that was banned. Your appeal is sent privately to staff.
            </p>
            <a
              href="/api/auth/discord?next=/appeal"
              className="inline-block w-full py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              Login with Discord
            </a>
          </div>
        ) : (
          <AppealForm
            userName={session.global_name || session.username}
            status={latest ? { status: latest.status, note: latest.review_note, by: latest.reviewed_by, invite: latest.invite_url ?? null, reviewedAt: latest.reviewed_at, createdAt: latest.created_at } : null}
          />
        )}
      </div>
    </main>
  );
}
