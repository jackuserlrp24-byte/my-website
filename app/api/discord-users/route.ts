import { NextResponse } from 'next/server';

const GUILD_ID = '1114227914842521630'; // Central Operations Discord Guild ID

const LEADERSHIP_IDS = [
  { id: '1268680281896910910', role: 'Ownership Team', title: 'Founder & Lead Developer' },
  { id: '1431281945337397268', role: 'Ownership Team', title: 'Co-Owner' },
  { id: '1229822710448918542', role: 'Ownership Team', title: 'Co-Owner' },
  { id: '1258133730959298631', role: 'Management Team', title: 'Senior Management' },
];

export async function GET() {
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!botToken) {
    return NextResponse.json({ error: 'Discord Bot Token missing' }, { status: 500 });
  }

  try {
    const userProfiles = await Promise.all(
      LEADERSHIP_IDS.map(async (item) => {
        // Query the Guild Member endpoint to fetch server-specific nickname
        const res = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${item.id}`, {
          headers: {
            Authorization: `Bot ${botToken}`,
          },
          next: { revalidate: 300 }, // Cache profiles for 5 minutes
        });

        if (!res.ok) {
          return {
            id: item.id,
            role: item.role,
            title: item.title,
            displayName: 'Unknown User',
            avatarUrl: '/logo.png',
          };
        }

        const data = await res.json();
        const user = data.user;

        // Determine server nickname -> server avatar / profile avatar
        const serverNickname = data.nick || data.user.global_name || data.user.username;
        
        // Priority: Guild Avatar -> Global Avatar -> Default Avatar
        let avatarUrl = 'https://cdn.discordapp.com/embed/avatars/0.png';
        if (data.avatar) {
          avatarUrl = `https://cdn.discordapp.com/guilds/${GUILD_ID}/users/${user.id}/avatars/${data.avatar}.png?size=128`;
        } else if (user.avatar) {
          avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
        }

        return {
          id: user.id,
          role: item.role,
          title: item.title,
          displayName: serverNickname,
          avatarUrl,
        };
      })
    );

    return NextResponse.json({ users: userProfiles });
  } catch (err) {
    console.error('Error fetching Discord server nicknames:', err);
    return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
  }
}