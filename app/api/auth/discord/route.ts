import { NextResponse } from 'next/server';
import { getRedirectUri } from '@/lib/discord-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

  if (!CLIENT_ID) {
    return new NextResponse('Missing DISCORD_CLIENT_ID environment variable', { status: 500 });
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: 'identify guilds',
  });

  const res = NextResponse.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
