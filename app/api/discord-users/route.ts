import { NextResponse } from 'next/server';

// Type your names and titles manually here! Avatars will sync automatically via Discord IDs.
const LEADERSHIP_TEAM = [
  { id: '1268680281896910910', name: 'Jackus', role: 'Ownership Team', title: 'Founder & Lead Developer' },
  { id: '1431281945337397268', name: 'Dobbie', role: 'Ownership Team', title: 'Co-Owner' },
  { id: '1229822710448918542', name: 'OllieX', role: 'Ownership Team', title: 'Co-Owner' },
  { id: '1030984139081523310', name: 'Co-Owner', role: 'Ownership Team', title: 'Co-Owner' },
  { id: '1258133730959298631', name: 'TT438596', role: 'Management Team', title: 'Senior Management' },
];

export async function GET() {
  const botToken = process.env.DISCORD_BOT_TOKEN;

  try {
    const userProfiles = await Promise.all(
      LEADERSHIP_TEAM.map(async (item) => {
        let avatarUrl = 'https://cdn.discordapp.com/embed/avatars/0.png';

        if (botToken) {
          try {
            const res = await fetch(`https://discord.com/api/v10/users/${item.id}`, {
              headers: { Authorization: `Bot ${botToken}` },
              next: { revalidate: 300 },
            });
            if (res.ok) {
              const data = await res.json();
              if (data.avatar) {
                avatarUrl = `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png?size=128`;
              }
            }
          } catch (e) {
            console.error(`Failed to fetch avatar for ${item.name}`);
          }
        }

        return {
          id: item.id,
          name: item.name,
          role: item.role,
          title: item.title,
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