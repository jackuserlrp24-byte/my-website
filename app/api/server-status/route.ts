import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CFX_JOIN_CODE = 'bddq8g4';

let liveCache = {
  isOnline: false,
  players: [] as Array<{ id: number; name: string; ping: number }>,
  maxClients: 64,
  serverIcon: null as string | null,
  lastUpdated: 0
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    liveCache.isOnline = true;
    liveCache.players = Array.isArray(body.players) ? body.players : [];
    liveCache.maxClients = Number(body.maxClients || 64);
    liveCache.lastUpdated = Date.now();

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}

export async function GET() {
  const isStale = Date.now() - liveCache.lastUpdated > 15000;
  const online = !isStale && liveCache.isOnline;

  // Fetch server icon from Cfx.re if not already cached
  let serverIcon = liveCache.serverIcon;
  if (!serverIcon) {
    try {
      const cfxRes = await fetch(`https://frontend.cfx-services.net/api/servers/single/${CFX_JOIN_CODE}`, {
        headers: { 'User-Agent': 'CentralOperationsPortal/1.0' },
        cache: 'no-store'
      });
      if (cfxRes.ok) {
        const json = await cfxRes.json();
        const serverData = json.Data || json;
        // Cfx.re provides the server icon as a base64 string or icon hash
        if (serverData.icon) {
          serverIcon = `data:image/png;base64,${serverData.icon}`;
          liveCache.serverIcon = serverIcon;
        }
      }
    } catch {
      // Fallback if Cfx icon fetch fails
    }
  }

  return NextResponse.json({
    isOnline: online,
    players: online ? liveCache.players : [],
    maxClients: liveCache.maxClients,
    serverIcon: serverIcon || null
  });
}