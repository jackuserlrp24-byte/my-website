import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SERVER_ENDPOINT = 'http://194.164.96.98:40207';

export async function GET() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout

    const playersRes = await fetch(`${SERVER_ENDPOINT}/players.json`, { 
      cache: 'no-store',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!playersRes.ok) {
      return NextResponse.json({ 
        isOnline: false, 
        players: [], 
        maxClients: 64, 
        error: `HTTP Error: ${playersRes.status}` 
      });
    }

    const rawPlayers = await playersRes.json();
    
    let maxClients = 64;
    try {
      const dynamicRes = await fetch(`${SERVER_ENDPOINT}/dynamic.json`, { 
        cache: 'no-store',
        signal: AbortSignal.timeout(2000) 
      });
      if (dynamicRes.ok) {
        const dynamicData = await dynamicRes.json();
        maxClients = dynamicData.clients || 64;
      }
    } catch {
      // Ignore dynamic.json failure if players.json worked
    }

    const players = Array.isArray(rawPlayers) ? rawPlayers.map((p: any) => ({
      id: p.id ?? p.endpointId ?? 0,
      name: p.name ?? 'Unknown Operator',
      ping: p.ping ?? 0
    })) : [];

    return NextResponse.json({
      isOnline: true,
      players,
      maxClients,
      error: null
    });
  } catch (err: any) {
    return NextResponse.json({ 
      isOnline: false, 
      players: [], 
      maxClients: 64, 
      error: err?.message || 'Connection timeout / blocked' 
    });
  }
}