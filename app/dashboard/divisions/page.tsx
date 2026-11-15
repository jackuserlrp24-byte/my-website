import { redirect } from 'next/navigation';
import { getPortalUser, limitedHome, supabaseAdmin } from '@/lib/portal';
import type { Division, DivisionApplication } from '@/lib/portal-types';
import { closeExpiredDivisions } from '@/lib/division-deadlines';
import DivisionsClient from './DivisionsClient';

export const dynamic = 'force-dynamic';

export default async function DivisionsPage() {
  const user = await getPortalUser();
  if (!user) redirect('/');
  if (user.limited) redirect(limitedHome(user.limited)!);

  await closeExpiredDivisions();

  const [divisionsRes, mineRes, pendingRes, reviewedRes] = await Promise.all([
    supabaseAdmin.from('divisions').select('*').order('department').order('sort_order'),
    supabaseAdmin
      .from('division_applications')
      .select('*')
      .eq('discord_id', user.id)
      .order('created_at', { ascending: false }),
    user.canViewApplications
      ? supabaseAdmin
          .from('division_applications')
          .select('*, divisions(name, department)')
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] }),
    user.canViewApplications
      ? supabaseAdmin
          .from('division_applications')
          .select('*, divisions(name, department)')
          .neq('status', 'pending')
          .order('reviewed_at', { ascending: false })
          .limit(15)
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <DivisionsClient
      user={{ name: user.name, isManagement: user.isManagement, isCommand: user.isCommand, canViewApplications: user.canViewApplications }}
      divisions={(divisionsRes.data ?? []) as Division[]}
      myApplications={(mineRes.data ?? []) as DivisionApplication[]}
      pendingApplications={(pendingRes.data ?? []) as DivisionApplication[]}
      reviewedApplications={(reviewedRes.data ?? []) as DivisionApplication[]}
      loadError={divisionsRes.error ? 'Divisions table not found. Run supabase/full-setup.sql in Supabase.' : null}
    />
  );
}
