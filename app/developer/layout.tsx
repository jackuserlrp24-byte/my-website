import { redirect } from 'next/navigation';
import StandaloneShell from '@/app/components/StandaloneShell';
import { getPortalUser } from '@/lib/portal';

export const dynamic = 'force-dynamic';

// Standalone page (not inside the dashboard layout). Never put it behind a maintenance gate: developers use it to switch those off.
export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await getPortalUser();
  if (!user) redirect('/');
  if (!user.isDeveloper) redirect('/dashboard');

  return (
    <StandaloneShell title="Developer Panel" accent="text-amber-300" backHref={user.limited ? null : '/dashboard'}>
      {children}
    </StandaloneShell>
  );
}
