import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const MASTER_ROLE_ID = '1497557905275224149';
const MANAGEMENT_ROLE_ALT = '1497557905275224148';

async function verifyManagementAccess(userId: string) {
  if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) return true;

  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${userId}`, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
      next: { revalidate: 600 }
    });
    
    if (!res.ok) return false;

    const member = await res.json();
    const roles: string[] = Array.isArray(member.roles) ? member.roles : [];
    
    return roles.includes(MASTER_ROLE_ID) || roles.includes(MANAGEMENT_ROLE_ALT);
  } catch (err) {
    console.error('Management layout verification error:', err);
    return false;
  }
}

export default async function ManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('discord_user')?.value;
  const user = userCookie ? JSON.parse(userCookie) : null;

  if (!user?.id) {
    redirect('/api/auth/discord/login');
  }

  const isManagement = await verifyManagementAccess(user.id);

  if (!isManagement) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}