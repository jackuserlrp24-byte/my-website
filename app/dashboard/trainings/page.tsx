import { redirect } from 'next/navigation';
import { getPortalUser, supabaseAdmin } from '@/lib/portal';
import type { Division, Training } from '@/lib/portal-types';
import TrainingsClient from './TrainingsClient';

export const dynamic = 'force-dynamic';

export default async function TrainingsPage() {
  const user = await getPortalUser();
  if (!user) redirect('/');

  // Show upcoming trainings, plus anything that finished in the last 24 hours.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [trainingsRes, divisionsRes] = await Promise.all([
    supabaseAdmin.from('trainings').select('*').gte('ends_at', since).order('starts_at', { ascending: true }),
    supabaseAdmin.from('divisions').select('*').order('department').order('sort_order'),
  ]);

  return (
    <TrainingsClient
      user={{ name: user.name, isManagement: user.isManagement }}
      trainings={(trainingsRes.data ?? []) as Training[]}
      divisions={(divisionsRes.data ?? []) as Division[]}
      loadError={trainingsRes.error ? 'Trainings table not found. Run supabase/trainings-divisions.sql in Supabase.' : null}
    />
  );
}
