import { redirect } from 'next/navigation';
import { PanelGate } from '@/app/components/MaintenanceGates';
import StandaloneShell from '@/app/components/StandaloneShell';
import { getPortalUser, supabaseAdmin } from '@/lib/portal';
import StaffSidebar from './StaffSidebar';

export const dynamic = 'force-dynamic';

// Standalone page (not inside the dashboard layout), so it opens fast and in its own tab.
export default async function Layout({ children }: { children: React.ReactNode }) {
  // getPortalUser is cached per request, so the page under this layout reuses the same Discord lookup.
  const user = await getPortalUser();
  if (!user) redirect('/');
  if (!user.canStaff) redirect('/dashboard');

  // Pending ban appeals badge (silently 0 if the table is not set up yet).
  let pendingAppeals = 0;
  try {
    const { count } = await supabaseAdmin.from('ban_appeals').select('id', { count: 'exact', head: true }).eq('status', 'pending');
    pendingAppeals = count ?? 0;
  } catch {
    pendingAppeals = 0;
  }

  return (
    <StandaloneShell title="Staff Panel" backHref={user.limited ? null : '/dashboard'}>
      <PanelGate panel="staff">
        <div className="flex flex-col lg:flex-row items-start gap-6 px-8 mt-6 max-w-[1450px] mx-auto w-full">
          <StaffSidebar pendingAppeals={pendingAppeals} showPatrols={!user.limited} />
          <div className="flex-1 min-w-0 w-full">{children}</div>
        </div>
      </PanelGate>
    </StandaloneShell>
  );
}
