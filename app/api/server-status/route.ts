import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ROCKETNODE_ENDPOINT = 'http://194.164.96.98:40207';
const CFX_JOIN_CODE = 'bddq8g4';

export async function GET() {
  try {
    let isOnline = false;
    let players: Array<{ id: number; name: string; ping: number }> = [];
    let maxClients = 64;

    // 1. Attempt Direct RocketNode FXServer HTTP Query
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`${ROCKETNODE_ENDPOINT}/players.json`, {
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const raw = await res.json();
        if (Array.isArray(raw)) {
          players = raw.map((p: any) => ({
            id: p.id ?? p.endpointId ?? 0,
            name: p.name ?? 'Unknown Operator',
            ping: p.ping ?? 0
          }));
          isOnline = true;
        }
      }
    } catch {
      // Direct IP query failed or timed out; will seamlessly fall back below
    }

    // 2. Fallback to Official Cfx.re API if Direct IP is blocked by host firewall
    if (!isOnline) {
      try {
        const cfxRes = await fetch(`https://frontend.cfx-services.net/api/servers/single/${CFX_JOIN_CODE}`, {
          headers: { 'User-Agent': 'CentralOperationsPortal/1.0' },
          cache: 'no-store'
        });
        const contentType = cfxRes.headers.get('content-type') || '';
        
        if (cfxRes.ok && contentType.includes('application/json')) {
          const json = await cfxRes.json();
          const serverData = json.Data || json;
          const rawPlayers = serverData.players || [];
          maxClients = Number(serverData.vars?.sv_maxclients || serverData.sv_maxclients || 64);

          players = rawPlayers.map((p: any) => ({
            id: p.id ?? 0,
            name: p.name ?? 'Player',
            ping: p.ping ?? 0
          }));
          isOnline = true;
        }
      } catch {
        // Fallback failed
      }
    }

    return NextResponse.json({
      isOnline,
      players,
      maxClients,
      error: isOnline ? null : 'Server unreachable / offline'
    });

  } catch (err: any) {
    return NextResponse.json({
      isOnline: false,
      players: [],
      maxClients: 64,
      error: err?.message || 'Unexpected connection failure'
    });
  }
}