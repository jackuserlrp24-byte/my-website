import { PanelGate } from '@/app/components/MaintenanceGates';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PanelGate panel="whitelist">{children}</PanelGate>;
}
