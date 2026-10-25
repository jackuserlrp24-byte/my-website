import { NextResponse } from 'next/server';

const LEADERSHIP_IDS = [
  { id: '1268680281896910910', role: 'Ownership Team', title: 'Founder & Lead Developer', fallbackName: 'Jackus' },
  { id: '1431281945337397268', role: 'Ownership Team', title: 'Co-Owner', fallbackName: 'Dobbie' },
  { id: '1229822710448918542', role: 'Ownership Team', title: 'Co-Owner', fallbackName: 'OllieX' },
  { id: '1258133730959298631', role: 'Management Team', title: 'Senior Management', fallbackName: 'Staff' },
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
          next: { revalidate: 300 }, // Cache profiles for 5 minutes
        });

        if (!res.ok) {
          return {
            id: item.id,
            role: item.role,
            title: item.title,
            displayName: item.fallbackName,
            avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png',
          };
        }

        const data = await res.json();
        
        // Use their Discord display name, or username, with a safe fallback
        const displayName = data.global_name || data.username || item.fallbackName;

        // Construct their Discord profile avatar URL
        const avatarUrl = data.avatar
          ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png?size=128`
          : 'https://cdn.discordapp.com/embed/avatars/0.png';

        return {
          id: data.id,
          role: item.role,
          title: item.title,
          displayName,
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