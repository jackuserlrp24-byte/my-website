import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPortalUser, supabaseAdmin } from '@/lib/portal';
import type { GameAction, ModerationLog } from '@/lib/portal-types';
import StaffClient from './StaffClient';
import ManagementClient from './ManagementClient';
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

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ view?: string; search?: string }> }) {
  const user = await getPortalUser();
  if (!user) redirect('/');
  if (!user.canStaff) redirect('/dashboard');

  const { view, search } = await searchParams;
  const showManagement = user.isManagement && view === 'management';

  // Management / Ownership get a switch at the top of the Staff Panel. Everyone else just sees the staff tools.
  const switcher = user.isManagement && (
    <div className="flex gap-1 mb-6 border-b border-neutral-800">
      {[
        { href: '/dashboard/staff', label: 'Moderation', on: !showManagement },
        { href: '/dashboard/staff?view=management', label: 'Management', on: showManagement },
      ].map((t) => (
        <Link
          key={t.label}
          href={t.href}
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 -mb-px transition-colors ${
            t.on ? 'text-white border-[#5865F2]' : 'text-neutral-500 border-transparent hover:text-neutral-200'
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );

  if (showManagement) {
    const data = await loadManagementData(search || '');
    return (
      <>
        {switcher}
        <ManagementClient
          currentModName={user.name || 'Central Operations Team'}
          allUsers={data.allUsers}
          notices={data.notices}
          moderationLogs={data.moderationLogs}
          patrols={data.patrols}
          modSearchQuery={search || ''}
          actions={{ postNotice, editNotice, deleteNotice, issueModeration, createManagementPatrol, deletePatrol }}
        />
      </>
    );
  }

  const [{ data }, { data: game }] = await Promise.all([
    supabaseAdmin.from('moderation_logs').select('*').order('created_at', { ascending: false }).limit(30),
    supabaseAdmin.from('game_actions').select('*').order('created_at', { ascending: false }).limit(12),
  ]);

  return (
    <>
      {switcher}
      <StaffClient
        canModerate={user.canModerate}
        recent={(data ?? []) as ModerationLog[]}
        gameActions={(game ?? []) as GameAction[]}
      />
    </>
  );
}
