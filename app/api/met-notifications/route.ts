import { NextResponse } from 'next/server';
import { getOfficer } from '@/lib/met-access';
import { loadNotifications } from '@/lib/met-notifications';

export const dynamic = 'force-dynamic';

export async function GET() {
  const officer = await getOfficer();
  if (!officer) return NextResponse.json({ items: [] }, { status: 401 });
  return NextResponse.json({ items: await loadNotifications(officer.id) }, { headers: { 'Cache-Control': 'no-store' } });
}
