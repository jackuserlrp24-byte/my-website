import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SERVER_ENDPOINT = 'http://194.164.96.98:40207';

export async function GET() {
  try {
    const [playersRes, dynamicRes] = await Promise.all([
      fetch(`${SERVER_ENDPOINT}/players.json`, { 
        cache: 'no-store',
        signal: AbortSignal.timeout(4000) 
      }),
      fetch(`${SERVER_ENDPOINT}/dynamic.json`, { 
        cache: 'no-store',
        signal: AbortSignal.timeout(4000) 
      })
    ]);

    let players = [];
    let maxClients = 64;
    let isOnline = false;

    if (playersRes.ok) {
      const rawPlayers = await playersRes.json();
      if (Array.isArray(rawPlayers)) {
        players = rawPlayers.map((p: any) => ({
          id: p.id ?? p.endpointId ?? 0,
          name: p.name ?? 'Unknown Operator',
          ping: p.ping ?? 0
        }));
        isOnline = true;
      }
    }

    if (dynamicRes.ok) {
      const dynamicData = await dynamicRes.json();
      maxClients = dynamicData.clients || 64;
    }

    return NextResponse.json({
      isOnline,
      players,
      maxClients
    });
  } catch (err) {
    return NextResponse.json({ isOnline: false, players: [], maxClients: 64 });
  }
}