import { notFound, redirect } from 'next/navigation';
import { getPortalUser, supabaseAdmin } from '@/lib/portal';
import { COMMAND_DEPARTMENTS, canOpenDepartment } from '@/lib/departments';
import type { Division, DivisionApplication } from '@/lib/portal-types';
import { closeExpiredDivisions } from '@/lib/division-deadlines';
import DepartmentCommandClient from './DepartmentCommandClient';

export const dynamic = 'force-dynamic';

export default async function DepartmentCommandPage({ params }: { params: Promise<{ dept: string }> }) {
  const { dept: slug } = await params;
  const dept = COMMAND_DEPARTMENTS[slug];
  if (!dept) notFound(); // /dashboard/command/met-police is its own page and takes priority over this one

  const user = await getPortalUser();
  if (!user) redirect('/');
  if (!canOpenDepartment(user.roles, user.isManagement, dept)) redirect('/dashboard/command');

  await closeExpiredDivisions();

  const [divisionsRes, pendingRes, reviewedRes] = await Promise.all([
    supabaseAdmin
      .from('divisions')
      .select('*')
      .in('department', dept.divisionDepartments)
      .order('department')
      .order('sort_order'),
    supabaseAdmin
      .from('division_applications')
      .select('*, divisions!inner(name, department)')
      .in('divisions.department', dept.divisionDepartments)
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('division_applications')
      .select('*, divisions!inner(name, department)')
      .in('divisions.department', dept.divisionDepartments)
      .neq('status', 'pending')
      .order('reviewed_at', { ascending: false })
      .limit(20),
  ]);

  return (
    <DepartmentCommandClient
      title={dept.title}
      short={dept.short}
      accent={dept.accent}
      userName={user.name}
      rosterHref={slug === 'las' ? '/dashboard/command/las/roster' : undefined}
      divisions={(divisionsRes.data ?? []) as Division[]}
      pending={(pendingRes.data ?? []) as DivisionApplication[]}
      reviewed={(reviewedRes.data ?? []) as DivisionApplication[]}
      loadError={
        divisionsRes.error
          ? 'Could not load divisions. Run the latest supabase/full-setup.sql in Supabase (it adds the LAS / LFB / Control recruitment divisions).'
          : null
      }
    />
  );
}
