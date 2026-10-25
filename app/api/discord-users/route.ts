import { NextResponse } from 'next/server';

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
        const res = await fetch(`https://discord.com/api/v10/users/${item.id}`, {
          headers: {
            Authorization: `Bot ${botToken}`,
          },
          next: { revalidate: 3600 }, // Cache profiles for 1 hour
        });

        if (!res.ok) {
          return {
            id: item.id,
            role: item.role,
            title: item.title,
            username: 'Unknown User',
            global_name: null,
            avatarUrl: '/logo.png',
          };
        }

        const data = await res.json();
        const avatarUrl = data.avatar
          ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png?size=128`
          : 'https://cdn.discordapp.com/embed/avatars/0.png';

        return {
          id: data.id,
          role: item.role,
          title: item.title,
          username: data.username,
          global_name: data.global_name || data.username,
          avatarUrl,
        };
      })
    );

    return NextResponse.json({ users: userProfiles });
  } catch (err) {
    console.error('Error fetching Discord user profiles:', err);
    return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
  }
}