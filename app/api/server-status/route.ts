import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

let liveCache = {
  isOnline: false,
  players: [] as Array<{ id: number; name: string; ping: number }>,
  maxClients: 64,
  serverIcon: null as string | null,
  lastUpdated: 0
};

// POST: Receives live player list and logo from CO-PortalSync
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    liveCache.isOnline = true;
    liveCache.players = Array.isArray(body.players) ? body.players : [];
    liveCache.maxClients = Number(body.maxClients || 64);
    if (body.serverIcon) {
      liveCache.serverIcon = body.serverIcon;
    }
    liveCache.lastUpdated = Date.now();

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}

// GET: Serves the live player list and logo to FiveMStatusWidget
export async function GET() {
  const isStale = Date.now() - liveCache.lastUpdated > 15000;
  const online = !isStale && liveCache.isOnline;

  return NextResponse.json({
    isOnline: online,
    players: online ? liveCache.players : [],
    maxClients: liveCache.maxClients,
    serverIcon: online ? liveCache.serverIcon : null
  });
}