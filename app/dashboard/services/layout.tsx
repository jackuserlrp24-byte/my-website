import { PanelGate } from '@/app/components/MaintenanceGates';
import { redirect } from 'next/navigation';

import { hasCommandAccess } from '@/lib/training-config';
import { hasLasAccess } from '@/lib/departments';
import { getDiscordSession } from '@/lib/discord-session';
import { getGuildMember } from '@/lib/discord-member';

// Same people who can see the Command tab can open the Services Hub.
export default async function ServicesLayout({ children }: { children: React.ReactNode }) {
  const session = await getDiscordSession();
  if (!session?.id) redirect('/dashboard');

  const result = await getGuildMember(session.id);
  const roles = result.status === 'ok' && Array.isArray(result.member.roles) ? result.member.roles : [];
  if (!hasCommandAccess(roles) && !hasLasAccess(roles)) redirect('/dashboard');

  return <PanelGate panel="command">{children}</PanelGate>;
}
