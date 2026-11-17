import { redirect } from 'next/navigation';
import { getPortalUser, supabaseAdmin } from '@/lib/portal';
import { syncLoas, type LoaRequest } from '@/lib/loa';
import { londonToday } from '@/lib/london-time';
import { hasCommandRank } from '@/lib/met-access';
import { getOfficerOptions, type OfficerOption } from '@/lib/met-officers';
import LoaClient, { type RotaShift } from './LoaClient';

export const dynamic = 'force-dynamic';

// The Leave of Absence page inside the Met Police portal (opened from Command > Leave of Absence).
export default async function MetLoaPage() {
  const user = await getPortalUser();
  if (!user) redirect('/');
  if (!user.isCommand) redirect('/met-police/command');

  try {
    await syncLoas();
  } catch (err) {
    console.error('LOA sync failed:', err);
  }

  const [current, mine] = await Promise.all([
    supabaseAdmin.from('loa_requests').select('*').in('status', ['active', 'approved']).order('start_date', { ascending: true }).limit(100),
    supabaseAdmin.from('loa_requests').select('*').eq('discord_id', user.id).order('created_at', { ascending: false }).limit(15),
  ]);

  // The duty rota is for command rank only (Gold / Silver / Bronze, or management); it is never loaded for anyone else.
  let rota: RotaShift[] | null = null;
  let officers: OfficerOption[] = [];
  if (hasCommandRank(user)) {
    const [shifts, list] = await Promise.all([
      supabaseAdmin.from('duty_rota').select('*').gte('shift_date', londonToday()).order('shift_date', { ascending: true }).order('start_time', { ascending: true }).limit(200),
      getOfficerOptions(),
    ]);
    rota = (shifts.data ?? []) as RotaShift[];
    officers = list;
  }

  return (
    <LoaClient
      rota={rota}
      officers={officers}
      userId={user.id}
      canEndAny={user.isManagement}
      today={londonToday()}
      current={(current.data ?? []) as LoaRequest[]}
      mine={(mine.data ?? []) as LoaRequest[]}
      loadError={current.error ? 'LOA table not found. Run supabase/full-setup.sql in Supabase.' : null}
    />
  );
}
