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
  const soon = m.site.mode === 'coming_soon';
  return <MaintenanceScreen fullPage devLogin mode={m.site.mode} title={soon ? 'Website coming soon' : 'Website under maintenance'} message={m.site.message} />;
}

/** Returns the maintenance / coming soon screen for a panel, or null when it is open (or the viewer is a developer). */
export async function panelBlock(panel: PanelKey): Promise<React.ReactElement | null> {
  const m = await getMaintenance();
  const entry = m.panels[panel];
  if (!entry?.on) return null;
  const user = await getPortalUser();
  if (user?.isDeveloper) return null;
  const label = MAINTENANCE_PANELS.find((p) => p.key === panel)?.label ?? 'This section';
  const soon = entry.mode === 'coming_soon';
  return (
    <MaintenanceScreen
      fullPage={panel === 'appeal' || panel === 'whitelist'}
      mode={entry.mode}
      title={soon ? `${label} is coming soon` : `${label} is under maintenance`}
      message={entry.message}
    />
  );
}

/** One panel / page. */
export async function PanelGate({ panel, children }: { panel: PanelKey; children: React.ReactNode }) {
  const blocked = await panelBlock(panel);
  return blocked ?? <>{children}</>;
}
