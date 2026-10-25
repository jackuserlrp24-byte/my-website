import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Simple in-memory cache on your Next.js server for instant access
let cachedServerData = {
  isOnline: false,
  players: [] as Array<{ id: number; name: string; ping: number }>,
  maxClients: 64,
  lastUpdated: 0
};

// POST: Called by your FiveM server script every 5 seconds
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    // Optional secret key check to ensure only your server can update this
    if (authHeader !== `Bearer ${process.env.FIVEM_SYNC_SECRET || 'CentralOpsSecret2026'}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    cachedServerData = {
      isOnline: true,
      players: body.players || [],
      maxClients: body.maxClients || 64,
      lastUpdated: Date.now()
    };

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}

// GET: Called by your Dashboard Widget to display the players
export async function GET() {
  const isStale = Date.now() - cachedServerData.lastUpdated > 15000; // If no sync for 15s, mark offline
  
  return NextResponse.json({
    isOnline: !isStale && cachedServerData.isOnline,
    players: isStale ? [] : cachedServerData.players,
    maxClients: cachedServerData.maxClients
  });
}