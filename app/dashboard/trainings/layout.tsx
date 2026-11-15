import { PanelGate } from '@/app/components/MaintenanceGates';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PanelGate panel="trainings">{children}</PanelGate>;
}
