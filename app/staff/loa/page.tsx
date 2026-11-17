import { redirect } from 'next/navigation';
import { getPortalUser } from '@/lib/portal';
import { londonToday } from '@/lib/london-time';
import LoaForm from './LoaForm';

export const dynamic = 'force-dynamic';

export default async function StaffLoaPage() {
  const user = await getPortalUser();
  if (!user) redirect('/');
  if (!user.canStaff) redirect('/dashboard');
  return <LoaForm today={londonToday()} />;
}
