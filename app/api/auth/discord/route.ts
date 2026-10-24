import { NextResponse } from 'next/server';

export async function GET() {
  const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  
  if (!CLIENT_ID) {
    return new NextResponse('Missing DISCORD_CLIENT_ID environment variable', { status: 500 });
  }

  // Explicitly locked to your live domain with zero chance of localhost fallback
  const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'https://centraloperationsportal.com/api/auth/discord/callback';
  const SCOPES = 'identify guilds';

  const discordOAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(SCOPES)}`;

  return NextResponse.redirect(discordOAuthUrl);
}