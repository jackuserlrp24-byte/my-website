import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const REQUIRED_ROLE_ID = '1497557905275224149';
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

export default async function CommandLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('discord_user')?.value;

  if (!userCookie) {
    redirect('/dashboard');
  }

  const user = JSON.parse(userCookie);
  const userId = user.id || user.discord_id;

  if (!userId || !DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
    redirect('/dashboard');
  }

  try {
    // Fetch live member roles from Discord API
    const res = await fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${userId}`, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
      cache: 'no-store'
    });

    if (!res.ok) {
      redirect('/dashboard');
    }

    const member = await res.json();
    const hasRole = member.roles && member.roles.includes(REQUIRED_ROLE_ID);

    // If the user does not have the required role ID, block access and redirect back
    if (!hasRole) {
      redirect('/dashboard');
    }
  } catch (err) {
    console.error('Role lock check failed:', err);
    redirect('/dashboard');
  }

  return <>{children}</>;
}