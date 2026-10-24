import { NextResponse } from 'next/server';

export async function GET() {
  const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  
  // Completely removed localhost. Locked to your live domain.
  const REDIRECT_URI = 'https://centraloperationsportal.com/api/auth/discord/callback';
  
  const scopes = 'identify guilds';
  const discordOAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scopes)}`;

  return NextResponse.redirect(discordOAuthUrl);
}