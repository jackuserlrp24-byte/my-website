import { PanelGate } from '@/app/components/MaintenanceGates';

// Lets a developer switch this section to "Under maintenance" or "Coming soon" from the Developer panel.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <PanelGate panel="met-my-details">{children}</PanelGate>;
}
