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
    let maxClients = 32;
    let isOnline = false;

    if (playersRes.ok) {
      players = await playersRes.json();
      isOnline = true;
    }

    if (dynamicRes.ok) {
      const dynamicData = await dynamicRes.json();
      maxClients = dynamicData.clients || 32;
    }

    return NextResponse.json({
      isOnline,
      players: Array.isArray(players) ? players.map((p: any) => ({
        id: p.id ?? 0,
        name: p.name ?? 'Unknown',
        ping: p.ping ?? 0
      })) : [],
      maxClients: Number(maxClients)
    });
  } catch (err) {
    return NextResponse.json({ isOnline: false, players: [], maxClients: 32 });
  }
}