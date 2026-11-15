import { redirect } from 'next/navigation';
import { PanelGate } from '@/app/components/MaintenanceGates';
import { getPortalUser, limitedHome } from '@/lib/portal';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await getPortalUser();
  if (user?.limited) redirect(limitedHome(user.limited)!);
  return <PanelGate panel="patrols">{children}</PanelGate>;
}
