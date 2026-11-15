import { redirect } from 'next/navigation';
import { getPortalUser, supabaseAdmin } from '@/lib/portal';
import type { BanAppeal } from '@/lib/appeals';
import AppealsClient from './AppealsClient';

export const dynamic = 'force-dynamic';

export default async function AppealsPage() {
  const user = await getPortalUser();
  if (!user) redirect('/');
  if (!user.canStaff) redirect('/dashboard');

  const { data } = await supabaseAdmin.from('ban_appeals').select('*').order('created_at', { ascending: false }).limit(200);

  const guild = process.env.DISCORD_GUILD_ID ?? '';
  return <AppealsClient initial={(data ?? []) as BanAppeal[]} canDecide={user.canModerate} guildId={guild} />;
}
