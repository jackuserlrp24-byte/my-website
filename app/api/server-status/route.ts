import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch('https://frontend.cfx-services.net/api/servers/single/bddq8g4', {
      headers: {
        'User-Agent': 'CentralOperationsPortal/1.0'
      },
      cache: 'no-store'
    });

    if (res.ok) {
      const json = await res.json();
      const serverData = json.Data || json;
      
      const rawPlayers = serverData.players || [];
      const maxClients = Number(serverData.vars?.sv_maxclients || serverData.sv_maxclients || 32);

      const players = rawPlayers.map((p: any) => ({
        id: p.id ?? 0,
        name: p.name ?? 'Unknown',
        ping: p.ping ?? 0
      }));

      return NextResponse.json({
        isOnline: true,
        players,
        maxClients
      });
    }

    return NextResponse.json({ isOnline: false, players: [], maxClients: 32 });
  } catch (err) {
    return NextResponse.json({ isOnline: false, players: [], maxClients: 32 });
  }
}