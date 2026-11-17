import { redirect } from 'next/navigation';
import { getPortalUser } from '@/lib/portal';
import { getMaintenance } from '@/lib/maintenance';
import { getSchedule, runScheduleEffects } from '@/lib/maintenance-schedule';
import DeveloperClient from './DeveloperClient';

export const dynamic = 'force-dynamic';

export default async function DeveloperPage() {
  const user = await getPortalUser();
  if (!user) redirect('/');
  if (!user.isDeveloper) redirect('/dashboard');

  await runScheduleEffects(); // may switch things on/off, so it runs before the reads
  const [initial, schedule] = await Promise.all([getMaintenance({ overlay: false }), getSchedule()]);
  return <DeveloperClient initial={initial} schedule={schedule} />;
}
