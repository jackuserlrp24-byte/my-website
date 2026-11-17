import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getPortalUser, supabaseAdmin } from '@/lib/portal';
import type { GameAction, ModerationLog } from '@/lib/portal-types';
import StaffClient from './StaffClient';
import AopCard from './AopCard';
import StaffStatsStrip from './StaffStats';
import { getStaffStats } from '@/lib/staff-stats';
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

  // Only what the main staff tools need is awaited here. The stats strip and the Management section (which makes a
  // Discord lookup per whitelisted user) load in the background, so the page appears straight away.
  const [{ data }, { data: game }] = await Promise.all([
    supabaseAdmin.from('moderation_logs').select('*').order('created_at', { ascending: false }).limit(30),
    supabaseAdmin.from('game_actions').select('*').order('created_at', { ascending: false }).limit(12),
  ]);

  return (
    <>
      <StaffClient
        canModerate={user.canModerate}
        recent={(data ?? []) as ModerationLog[]}
        gameActions={(game ?? []) as GameAction[]}
        topExtra={
          <Suspense fallback={<div className="h-28 bg-neutral-900 border border-neutral-800 animate-pulse" />}>
            <TopExtra />
          </Suspense>
        }
      />
      {user.isManagement && (
        <Suspense fallback={<div className="mt-6 h-96 bg-neutral-900 border border-neutral-800 animate-pulse" />}>
          <ManagementSection search={search || ''} userName={user.name} />
        </Suspense>
      )}
    </>
  );
}

async function TopExtra() {
  const [aop, stats] = await Promise.all([getAop(), getStaffStats()]);
  return (
    <div className="flex flex-col gap-6">
      <StaffStatsStrip stats={stats} />
      <AopCard initial={aop} />
    </div>
  );
}

// The administration tools sit under the staff tools, for Management / Ownership only.
async function ManagementSection({ search, userName }: { search: string; userName: string }) {
  const admin = await loadManagementData(search);
  return (
    <ManagementClient
      currentModName={userName || 'Central Operations Team'}
      allUsers={admin.allUsers}
      notices={admin.notices}
      moderationLogs={admin.moderationLogs}
      patrols={admin.patrols}
      modSearchQuery={search}
      actions={{ postNotice, editNotice, deleteNotice, issueModeration, createManagementPatrol, deletePatrol }}
    />
  );
}
