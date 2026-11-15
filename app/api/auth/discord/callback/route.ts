import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  ALLOWED_NEXT,
  NEXT_COOKIE,
  fetchWithRetry,
  getRedirectUri,
  setSessionCookie,
  siteUrl,
} from '@/lib/discord-auth';

export const dynamic = 'force-dynamic';

function fail(reason: string) {
  const res = NextResponse.redirect(siteUrl(`/?error=${reason}`));
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  // User pressed "Cancel" on Discord, or Discord sent back an error
  if (url.searchParams.get('error')) return fail('no_code');
  if (!code) return fail('no_code');

  try {
    const tokenResponse = await fetchWithRetry('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code,
        redirect_uri: getRedirectUri(), // identical to the one used to start the login
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error('Discord token exchange failed:', tokenResponse.status, tokenData);
      return fail('auth_failed');
    }

    const userResponse = await fetchWithRetry('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userData = await userResponse.json();
    if (!userResponse.ok || !userData?.id) {
      console.error('Discord profile fetch failed:', userResponse.status, userData);
      return fail('auth_failed');
    }

    // Server nickname is a bonus – a failure here must NEVER block the login.
    const GUILD_ID = process.env.DISCORD_GUILD_ID || process.env.DISCORD_SERVER_ID;
    const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

    let serverNickname: string = userData.global_name || userData.username;

    if (GUILD_ID && BOT_TOKEN) {
      try {
        const memberRes = await fetchWithRetry(
          `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userData.id}`,
          { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
        );
        if (memberRes.ok) {
          const memberData = await memberRes.json();
          serverNickname = memberData.nick || serverNickname;
        }
      } catch (err) {
        console.error('Could not fetch server member data:', err);
      }
    }

    const wanted = (await cookies()).get(NEXT_COOKIE)?.value;
    const destination = wanted && ALLOWED_NEXT.includes(wanted) ? wanted : '/dashboard';
    const res = NextResponse.redirect(siteUrl(destination));
    res.cookies.delete(NEXT_COOKIE);
    res.headers.set('Cache-Control', 'no-store');
    setSessionCookie(res, {
      id: userData.id,
      username: userData.username,
      global_name: userData.global_name ?? undefined,
      nickname: serverNickname,
      avatar: userData.avatar,
    });
    return res;
  } catch (error) {
    console.error('Discord Auth Error:', error);
    return fail('auth_failed');
  }
}
