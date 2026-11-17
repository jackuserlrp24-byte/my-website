import { NextRequest, NextResponse } from 'next/server';
import { currentDiscordId } from '@/lib/photo-auth';
import { getOrCreateWarrant } from '@/lib/warrant';

export const dynamic = 'force-dynamic';

// Logged-in officer: returns their warrant number, creating it on first visit.
export async function GET(req: NextRequest) {
  const id = await currentDiscordId(req);
  if (!id) return NextResponse.json({ ok: false, error: 'not logged in' }, { status: 401 });
  const warrant = await getOrCreateWarrant(id);
  if (!warrant) return NextResponse.json({ ok: false, error: 'could not create a warrant number' }, { status: 500 });
  return NextResponse.json({ ok: true, warrantCard: warrant });
}
