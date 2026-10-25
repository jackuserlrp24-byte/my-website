import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Global shared cache in memory
let liveCache = {
  isOnline: false,
  players: [] as Array<{ id: number; name: string; ping: number }>,
  maxClients: 64,
  lastUpdated: 0
};

// 1. POST: Receives live player data directly from your FiveM server script
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    liveCache = {
      isOnline: true,
      players: Array.isArray(body.players) ? body.players : [],
      maxClients: Number(body.maxClients || 64),
      lastUpdated: Date.now()
    };

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}

// 2. GET: Serves the live player list to your dashboard widget
export async function GET() {
  // If no sync received from the server in the last 15 seconds, mark offline
  const isStale = Date.now() - liveCache.lastUpdated > 15000;
  const online = !isStale && liveCache.isOnline;

  return NextResponse.json({
    isOnline: online,
    players: online ? liveCache.players : [],
    maxClients: liveCache.maxClients,
    error: online ? null : 'Waiting for server sync...'
  });
}