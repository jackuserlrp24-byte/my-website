import { redirect } from 'next/navigation';
import { getPortalUser, supabaseAdmin } from '@/lib/portal';
import { syncLoas, type LoaRequest } from '@/lib/loa';
import { londonToday } from '@/lib/london-time';
import LoaClient from './LoaClient';

export const dynamic = 'force-dynamic';

export default async function LoaPage() {
  const user = await getPortalUser();
  if (!user) redirect('/');
  if (!user.isCommand) redirect('/dashboard');

  try {
    await syncLoas();
  } catch (err) {
    console.error('LOA sync failed:', err);
  }

  const [current, mine] = await Promise.all([
    supabaseAdmin.from('loa_requests').select('*').in('status', ['active', 'approved']).order('start_date', { ascending: true }).limit(100),
    supabaseAdmin.from('loa_requests').select('*').eq('discord_id', user.id).order('created_at', { ascending: false }).limit(15),
  ]);

  return (
    <LoaClient
      userId={user.id}
      canEndAny={user.isManagement}
      today={londonToday()}
      current={(current.data ?? []) as LoaRequest[]}
      mine={(mine.data ?? []) as LoaRequest[]}
      loadError={current.error ? 'LOA table not found. Run supabase/full-setup.sql in Supabase.' : null}
    />
  );
}
