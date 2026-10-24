import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import WhitelistForm from './WhitelistForm';

export default async function WhitelistPage() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('discord_user')?.value;

  if (!userCookie) {
    redirect('/');
  }

  const user = JSON.parse(userCookie);
  const discordId = user.id;

  if (!discordId || discordId === '0000') {
    redirect('/');
  }

  return <WhitelistForm userDiscordId={discordId} />;
}