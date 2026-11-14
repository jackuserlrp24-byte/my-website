import { redirect } from 'next/navigation';
import { getPortalUser, supabaseAdmin } from '@/lib/portal';
import type { Division, DivisionApplication } from '@/lib/portal-types';
import DivisionsClient from './DivisionsClient';

export const dynamic = 'force-dynamic';

export default async function DivisionsPage() {
  const user = await getPortalUser();
  if (!user) redirect('/');

  const [divisionsRes, mineRes, pendingRes, reviewedRes] = await Promise.all([
    supabaseAdmin.from('divisions').select('*').order('department').order('sort_order'),
    supabaseAdmin
      .from('division_applications')
      .select('*')
      .eq('discord_id', user.id)
      .order('created_at', { ascending: false }),
    user.isManagement
      ? supabaseAdmin
          .from('division_applications')
          .select('*, divisions(name)')
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] }),
    user.isManagement
      ? supabaseAdmin
          .from('division_applications')
          .select('*, divisions(name)')
          .neq('status', 'pending')
          .order('reviewed_at', { ascending: false })
          .limit(15)
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <DivisionsClient
      user={{ name: user.name, isManagement: user.isManagement }}
      divisions={(divisionsRes.data ?? []) as Division[]}
      myApplications={(mineRes.data ?? []) as DivisionApplication[]}
      pendingApplications={(pendingRes.data ?? []) as DivisionApplication[]}
      reviewedApplications={(reviewedRes.data ?? []) as DivisionApplication[]}
      loadError={divisionsRes.error ? 'Divisions table not found. Run supabase/trainings-divisions.sql in Supabase.' : null}
    />
  );
}
