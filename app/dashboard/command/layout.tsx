import { PanelGate } from '@/app/components/MaintenanceGates';
import { redirect } from 'next/navigation';

import { hasCommandAccess } from '@/lib/training-config';
import { hasLasAccess } from '@/lib/departments';
import { getDiscordSession } from '@/lib/discord-session';
import { getGuildMember } from '@/lib/discord-member';

export default async function CommandLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getDiscordSession();
  if (!session?.id) {
    redirect('/dashboard');
  }

  // Live roles from Discord (cached ~60s, retried on rate limits).
  const result = await getGuildMember(session.id);
  const roles = result.status === 'ok' && Array.isArray(result.member.roles) ? result.member.roles : [];

  // If the user does not have the required role ID, block access and redirect back
  if (!hasCommandAccess(roles) && !hasLasAccess(roles)) {
    redirect('/dashboard');
  }

  return <PanelGate panel="command">{children}</PanelGate>;
}
