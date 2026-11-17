import { redirect } from 'next/navigation';
import { PanelGate } from '@/app/components/MaintenanceGates';
import { hasCommandAccess } from '@/lib/training-config';
import { getDiscordSession } from '@/lib/discord-session';
import { getGuildMember } from '@/lib/discord-member';

// The command area is also open to LAS command / developers (for the LAS suite). This section stays Met command only.
export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await getDiscordSession();
  if (!session?.id) redirect('/dashboard');
  const result = await getGuildMember(session.id);
  const roles = result.status === 'ok' && Array.isArray(result.member.roles) ? result.member.roles : [];
  if (!hasCommandAccess(roles)) redirect('/dashboard/command');
  return <PanelGate panel="command-loa">{children}</PanelGate>;
}
