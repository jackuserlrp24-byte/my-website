import { redirect } from 'next/navigation';
import { getPortalUser, supabaseAdmin } from '@/lib/portal';
import type { Division, RoleRequest, TrainingBar } from '@/lib/portal-types';
import TrainerClient from './TrainerClient';

export const dynamic = 'force-dynamic';

export default async function TrainerPage() {
  const user = await getPortalUser();
  if (!user) redirect('/');
  if (!user.isTrainer) redirect('/dashboard');

  const requestsQuery = user.canReviewRoleRequests
    ? supabaseAdmin.from('role_requests').select('*').order('created_at', { ascending: false }).limit(30)
    : user.canRequestRoles
    ? supabaseAdmin
        .from('role_requests')
        .select('*')
        .eq('requested_by_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30)
    : null;

  const [divisionsRes, requestsRes, barsRes] = await Promise.all([
    supabaseAdmin.from('divisions').select('*').order('department').order('sort_order'),
    requestsQuery ?? Promise.resolve({ data: [] }),
    supabaseAdmin.from('training_bars').select('*').is('lifted_at', null).order('created_at', { ascending: false }),
  ]);

  return (
    <TrainerClient
      divisions={(divisionsRes.data ?? []) as Division[]}
      requests={(requestsRes.data ?? []) as RoleRequest[]}
      bars={(barsRes.error ? [] : barsRes.data ?? []) as TrainingBar[]}
      canRequestRoles={user.canRequestRoles}
      canReview={user.canReviewRoleRequests}
    />
  );
}
