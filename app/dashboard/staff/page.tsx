import { redirect } from 'next/navigation';
import { getPortalUser, supabaseAdmin } from '@/lib/portal';
import type { ModerationLog } from '@/lib/portal-types';
import StaffClient from './StaffClient';

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  const user = await getPortalUser();
  if (!user) redirect('/');
  if (!user.canStaff) redirect('/dashboard');

  const { data } = await supabaseAdmin
    .from('moderation_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30);

  return <StaffClient canModerate={user.canModerate} recent={(data ?? []) as ModerationLog[]} />;
}
