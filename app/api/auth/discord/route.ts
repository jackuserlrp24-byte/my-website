import { NextResponse } from 'next/server';
import { ALLOWED_NEXT, NEXT_COOKIE, getRedirectUri } from '@/lib/discord-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
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

  // Remember where to send them afterwards (only whitelisted paths, e.g. the ban appeal page).
  const next = new URL(request.url).searchParams.get('next');
  if (next && ALLOWED_NEXT.includes(next)) {
    res.cookies.set(NEXT_COOKIE, next, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600 });
  } else {
    res.cookies.delete(NEXT_COOKIE);
  }
  return res;
}
