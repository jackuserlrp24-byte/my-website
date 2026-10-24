import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', request.url));
  }

  try {
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI!,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) throw new Error('Failed to fetch token from Discord');

    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();
    if (!userResponse.ok) throw new Error('Failed to fetch user profile from Discord');

    const GUILD_ID = process.env.DISCORD_SERVER_ID;
    const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

    let serverNickname = userData.username;
    let memberRoles: string[] = [];

    if (GUILD_ID && BOT_TOKEN) {
      try {
        const memberRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userData.id}`, {
          headers: {
            Authorization: `Bot ${BOT_TOKEN}`,
          },
        });

        if (memberRes.ok) {
          const memberData = await memberRes.json();
          serverNickname = memberData.nick || userData.username;
          memberRoles = memberData.roles || [];
        }
      } catch (err) {
        console.error('Could not fetch server member data:', err);
      }
    }

    const cookieStore = await cookies();
    cookieStore.set(
      'discord_user',
      JSON.stringify({
        id: userData.id,
        username: userData.username,
        nickname: serverNickname,
        avatar: userData.avatar,
        roles: memberRoles, // <--- Storing roles properly here
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      }
    );

    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (error) {
    console.error('Discord Auth Error:', error);
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url));
  }
}