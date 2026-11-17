import { redirect } from 'next/navigation';
import { getPortalUser, supabaseAdmin } from '@/lib/portal';
import type { ModerationLog } from '@/lib/portal-types';
import AutoRefresh from '../requests/AutoRefresh';
import LogsClient from './LogsClient';

export const dynamic = 'force-dynamic';

export default async function StaffLogsPage() {
  const user = await getPortalUser();
  if (!user) redirect('/');
  if (!user.canStaff) redirect('/dashboard');

  const { data, error } = await supabaseAdmin.from('moderation_logs').select('*').order('created_at', { ascending: false }).limit(300);

  return (
    <main className="flex flex-col w-full gap-6 pb-16 select-none antialiased">
      <AutoRefresh seconds={15} />
      <div className="w-full bg-neutral-900 border border-neutral-800 p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#5865F2]" />
        <span className="text-[10px] font-mono text-[#5865F2] tracking-widest uppercase block mb-1">STAFF</span>
        <h2 className="text-2xl font-bold tracking-tight text-neutral-100">Logs</h2>
        <p className="text-xs text-neutral-400 mt-1">Every note, warning, kick, ban and unban made through the portal. Showing the latest 300.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 text-xs font-mono text-red-300">
          Could not load logs. Run the latest supabase/full-setup.sql in Supabase.
        </div>
      )}

      <LogsClient logs={(data ?? []) as ModerationLog[]} />
    </main>
  );
}
