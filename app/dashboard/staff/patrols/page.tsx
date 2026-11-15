import { redirect } from 'next/navigation';
import { getPortalUser } from '@/lib/portal';
import StaffPatrols from './StaffPatrols';

export const dynamic = 'force-dynamic';

export default async function StaffPatrolsPage() {
  const user = await getPortalUser();
  if (!user) redirect('/');
  if (!user.canStaff) redirect('/dashboard');
  if (user.limited) redirect('/dashboard/staff'); // same rule as the main patrols page
  return <StaffPatrols />;
}
