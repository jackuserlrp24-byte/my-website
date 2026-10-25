import { NextResponse } from 'next/server';

// Type your names and titles manually here! Avatars will sync automatically via Discord IDs.
const LEADERSHIP_TEAM = [
  { id: '1268680281896910910', name: 'J.Costin', role: 'Ownership Team', title: 'Server Founder' },
  { id: '1229822710448918542', name: 'O.Riley', role: 'Ownership Team', title: 'Server Co-Founder' },
  { id: '1431281945337397268', name: 'J.Doyle', role: 'Ownership Team', title: 'Community Managment' },
  { id: '1030984139081523310', name: 'W.Wray', role: 'Ownership Team', title: 'Community Managment' },
  { id: '1258133730959298631', name: 'T.Wrap', role: 'Management Team', title: 'Community Support' },
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