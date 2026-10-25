import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch directly from our internal sync endpoint populated by the FiveM server script
    const res = await fetch('https://centraloperationsportal.com/api/sync-players', {
      cache: 'no-store'
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ isOnline: false, players: [], maxClients: 64 });
  } catch (err) {
    return NextResponse.json({ isOnline: false, players: [], maxClients: 64 });
  }
}