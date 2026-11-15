import { redirect } from 'next/navigation';
import { getPortalUser, supabaseAdmin } from '@/lib/portal';
import type { GameAction, ModerationLog } from '@/lib/portal-types';
import StaffClient from './StaffClient';
import AopCard from './AopCard';
import ManagementClient from './ManagementClient';
import { getAop } from '@/lib/aop';
import { loadManagementData } from './management-data';
import {
  postNotice,
  editNotice,
  deleteNotice,
  issueModeration,
  createManagementPatrol,
  deletePatrol,
} from './management-actions';

export const dynamic = 'force-dynamic';

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const user = await getPortalUser();
  if (!user) redirect('/');
  if (!user.canStaff) redirect('/dashboard');

  const { search } = await searchParams;

  const [{ data }, { data: game }, aop, admin] = await Promise.all([
    supabaseAdmin.from('moderation_logs').select('*').order('created_at', { ascending: false }).limit(30),
    supabaseAdmin.from('game_actions').select('*').order('created_at', { ascending: false }).limit(12),
    getAop(),
    // The administration tools sit under the staff tools, for Management / Ownership only.
    user.isManagement ? loadManagementData(search || '') : Promise.resolve(null),
  ]);

  return (
    <>
      <StaffClient
        canModerate={user.canModerate}
        recent={(data ?? []) as ModerationLog[]}
        gameActions={(game ?? []) as GameAction[]}
        topExtra={<AopCard initial={aop} />}
      />
      {admin && (
        <ManagementClient
          currentModName={user.name || 'Central Operations Team'}
          allUsers={admin.allUsers}
          notices={admin.notices}
          moderationLogs={admin.moderationLogs}
          patrols={admin.patrols}
          modSearchQuery={search || ''}
          actions={{ postNotice, editNotice, deleteNotice, issueModeration, createManagementPatrol, deletePatrol }}
        />
      )}
    </>
  );
}
