import { redirect } from 'next/navigation';
import { getPortalUser } from '@/lib/portal';
import ManagementPage from '../../management/page';

export const dynamic = 'force-dynamic';

// Management inside the staff sidebar. Management / Ownership only (same rule as /dashboard/management).
export default async function StaffManagementPage(props: { searchParams: Promise<{ search?: string }> }) {
  const user = await getPortalUser();
  if (!user) redirect('/');
  if (!user.isManagement) redirect('/dashboard/staff');
  return <ManagementPage searchParams={props.searchParams} />;
}
