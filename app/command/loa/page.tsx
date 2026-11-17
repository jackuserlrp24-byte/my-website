import { redirect } from 'next/navigation';
import { getPortalUser } from '@/lib/portal';
import { syncLoas } from '@/lib/loa';
import { londonToday } from '@/lib/london-time';
import LoaForm from './LoaClient';

export const dynamic = 'force-dynamic';

export default async function LoaPage() {
  const user = await getPortalUser();
  if (!user) redirect('/');
  if (!user.isCommand) redirect('/command');

  try {
    await syncLoas(); // keeps leave statuses and [LOA] names up to date
  } catch (err) {
    console.error('LOA sync failed:', err);
  }
  return <LoaForm today={londonToday()} />;
}
