import { NextResponse } from 'next/server';
import { getDiscordDisplayName, getDiscordSession } from '@/lib/discord-session';

export async function GET() {
  try {
    const session = await getDiscordSession();

    if (!session) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    }

    const displayName = getDiscordDisplayName(session);

    return NextResponse.json({
      user: {
        name: displayName,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }
}
