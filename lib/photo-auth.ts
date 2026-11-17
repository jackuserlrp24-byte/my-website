import { NextRequest } from 'next/server';

/**
 * !! THE ONE PIECE YOU MUST CONNECT !!
 * Return the Discord id of whoever is logged in to the portal (or null if nobody is).
 * Until this returns a real id, the website warrant number and photo upload answer 401.
 *
 * Examples (use whichever matches your login):
 *   NextAuth:   const s = await getServerSession(authOptions); return (s?.user as any)?.discordId ?? null;
 *   Cookie:     read your session cookie from req.cookies and look the user up in your session table.
 */
export async function currentDiscordId(_req: NextRequest): Promise<string | null> {
  return null;
}
