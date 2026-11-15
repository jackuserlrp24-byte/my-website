import { redirect } from 'next/navigation';
import { getPortalUser, supabaseAdmin } from '@/lib/portal';
import type { GameAction, ModerationLog } from '@/lib/portal-types';
import StaffClient from './StaffClient';

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  const user = await getPortalUser();
  if (!user) redirect('/');
  if (!user.canStaff) redirect('/dashboard');

  const [{ data }, { data: game }] = await Promise.all([
    supabaseAdmin.from('moderation_logs').select('*').order('created_at', { ascending: false }).limit(30),
    supabaseAdmin.from('game_actions').select('*').order('created_at', { ascending: false }).limit(12),
  ]);

  return (
    <StaffClient
      canModerate={user.canModerate}
      recent={(data ?? []) as ModerationLog[]}
      gameActions={(game ?? []) as GameAction[]}
    />
  );
}
