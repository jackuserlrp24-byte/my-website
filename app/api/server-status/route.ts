import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SERVER_ENDPOINT = 'http://194.164.96.98:40207';

export async function GET() {
  try {
    const [playersRes, dynamicRes] = await Promise.all([
      fetch(`${SERVER_ENDPOINT}/players.json`, { cache: 'no-store' }),
      fetch(`${SERVER_ENDPOINT}/dynamic.json`, { cache: 'no-store' })
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

    return NextResponse.json({ isOnline, players, maxClients });
  } catch (err) {
    return NextResponse.json({ isOnline: false, players: [], maxClients: 32 });
  }
}