import { redirect } from 'next/navigation';
import { getPortalUser } from '@/lib/portal';
import { getMaintenance } from '@/lib/maintenance';
import DeveloperClient from './DeveloperClient';

export const dynamic = 'force-dynamic';

export default async function DeveloperPage() {
  const user = await getPortalUser();
  if (!user) redirect('/');
  if (!user.isDeveloper) redirect('/dashboard');

  return <DeveloperClient initial={await getMaintenance()} />;
}
