import { PanelGate } from '@/app/components/MaintenanceGates';
import { MAINTENANCE_PANELS, type PanelKey } from '@/lib/maintenance-config';

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ dept: string }> }) {
  const { dept } = await params;
  const key = `command-${dept}` as PanelKey;
  if (!MAINTENANCE_PANELS.some((p) => p.key === key)) return <>{children}</>;
  return <PanelGate panel={key}>{children}</PanelGate>;
}
