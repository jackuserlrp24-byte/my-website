import { getPortalUser } from '@/lib/portal';
import { getMaintenance } from '@/lib/maintenance';
import { MAINTENANCE_PANELS, type PanelKey } from '@/lib/maintenance-config';
import MaintenanceScreen from './MaintenanceScreen';

/** Whole website. Founders / developers still get through so they can switch it back off. */
export async function SiteGate({ children }: { children: React.ReactNode }) {
  const m = await getMaintenance();
  if (!m.site.on) return <>{children}</>;
  const user = await getPortalUser();
  if (user?.isDeveloper) return <>{children}</>;
  return <MaintenanceScreen fullPage devLogin title="Website under maintenance" message={m.site.message} />;
}

/** One panel / page. */
export async function PanelGate({ panel, children }: { panel: PanelKey; children: React.ReactNode }) {
  const m = await getMaintenance();
  if (!m.panels[panel]?.on) return <>{children}</>;
  const user = await getPortalUser();
  if (user?.isDeveloper) return <>{children}</>;
  const label = MAINTENANCE_PANELS.find((p) => p.key === panel)?.label ?? 'This section';
  return <MaintenanceScreen fullPage={panel === 'appeal'} title={`${label} is under maintenance`} message={m.panels[panel].message} />;
}
