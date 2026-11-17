import { NextRequest } from 'next/server';

/**
 * !! THE ONE PIECE YOU MUST CONNECT !!
 * Return the Discord id of whoever is logged in to the portal (or null if nobody is).
 * I can't see how your portal does login (lib/portal.ts / your My Details page weren't in the zip),
 * so until this returns a real id, website uploads answer 401 and nothing is saved.
 */
export async function currentDiscordId(_req: NextRequest): Promise<string | null> {
  return null;
}
