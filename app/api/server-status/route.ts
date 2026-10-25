import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ROCKETNODE_IP = '194.164.96.98';
const ROCKETNODE_PORT = '40207';
const CFX_JOIN_CODE = 'bddq8g4';

export async function GET() {
  try {
    let isOnline = false;
    let players: Array<{ id: number; name: string; ping: number }> = [];
    let maxClients = 64;

    // 1. Attempt Direct FXServer HTTP Query to RocketNode for unmasked player data
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`http://${ROCKETNODE_IP}:${ROCKETNODE_PORT}/players.json`, {
        cache: 'no-store',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CentralOperationsPortal/1.0',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const raw = await res.json();
        if (Array.isArray(raw) && raw.length >= 0) {
          players = raw.map((p: any) => ({
            id: Number(p.id ?? p.endpointId ?? 0),
            name: String(p.name || 'Operator'),
            ping: Number(p.ping ?? 0)
          }));
          isOnline = true;
        }
      }
    } catch {
      // Direct IP query timed out or firewall blocked cloud IP; move to fallback
    }

    // 2. Fallback to Official Cfx.re API if direct IP is blocked by host firewall
    if (!isOnline) {
      try {
        const cfxRes = await fetch(`https://frontend.cfx-services.net/api/servers/single/${CFX_JOIN_CODE}`, {
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CentralOperationsPortal/1.0',
            'Accept': 'application/json' 
          },
          cache: 'no-store'
        });
        
        const contentType = cfxRes.headers.get('content-type') || '';
        if (cfxRes.ok && contentType.includes('application/json')) {
          const json = await cfxRes.json();
          const serverData = json.Data || json;
          const rawPlayers = serverData.players || [];
          maxClients = Number(serverData.vars?.sv_maxclients || serverData.sv_maxclients || 64);

          players = rawPlayers.map((p: any, idx: number) => ({
            id: Number(p.id ?? idx + 1),
            name: p.name && p.name !== 'Player' ? String(p.name) : `Operator #${p.id ?? idx + 1}`,
            ping: Number(p.ping ?? 0)
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