'use client';

import { useState, useEffect } from 'react';

interface Player {
  id: number;
  name: string;
  ping: number;
}

export default function FiveMStatusWidget() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [maxClients, setMaxClients] = useState(64);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  const CONNECT_URI = 'fivem://connect/cfx.re/join/bddq8g4';

  useEffect(() => {
    async function fetchServerStatus() {
      try {
        const res = await fetch('/api/server-status', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setIsOnline(data.isOnline);
          setPlayers(data.players || []);
          setMaxClients(data.maxClients || 64);
        } else {
          setIsOnline(false);
        }
      } catch {
        setIsOnline(false);
      } finally {
        setLoading(false);
      }
    }

    fetchServerStatus();
    const interval = setInterval(fetchServerStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-neutral-900/80 border border-neutral-800 p-6 shadow-xl backdrop-blur-md flex flex-col gap-4">
      
      {/* Section Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-600'}`} />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-200">
            Central Operations Live Server Status
          </h3>
        </div>
        <span className="text-[10px] font-mono text-[#5865F2]">
          {isOnline ? `${players.length} / ${maxClients} PLAYERS ONLINE` : 'SERVER OFFLINE / CONNECTING'}
        </span>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left Box: Centered Logo Header, Title, Description & Connect Button */}
        <div className="bg-neutral-950/80 border border-neutral-800 p-5 flex flex-col justify-center items-center gap-4 text-center">
          
          {/* Centered Large Logo Badge */}
          <div className="w-16 h-16 bg-neutral-900 border border-neutral-800 flex items-center justify-center shadow-inner">
            {/* Replace text below with an <img> tag if using an image file */}
            <span className="text-lg font-bold font-mono text-[#5865F2]">CO</span>
          </div>

          {/* Server Title & Subtitle */}
          <div>
            <h4 className="text-sm font-bold text-neutral-200 uppercase tracking-wider">
              Central Operations
            </h4>
            <p className="text-[11px] font-mono text-neutral-400 mt-0.5">
              UK Emergency Services Roleplay
            </p>
          </div>

          {/* Description */}
          <p className="text-xs text-neutral-400 font-sans leading-relaxed text-left w-full">
            Directly launch Grand Theft Auto V and connect to the Central Operations live roleplay server environment.
          </p>

          {/* Connect Button */}
          <a
            href={CONNECT_URI}
            className="w-full py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold tracking-wider uppercase transition-colors text-center block shadow-lg cursor-pointer"
          >
            Connect to Server
          </a>

        </div>

        {/* Right Box: Active Players Long Box */}
        <div className="lg:col-span-2 bg-neutral-950/80 border border-neutral-800 p-5 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
              Active Players In-Game ({players.length})
            </h4>
            <span className="text-[10px] font-mono text-neutral-500">Auto-refreshing (5s)</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 p-3 h-56 overflow-y-auto pr-1">
            {loading ? (
              <p className="text-xs text-neutral-500 italic py-16 text-center font-sans">
                Querying server data...
              </p>
            ) : players.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {players.map((player, index) => (
                  <div
                    key={`${player.id}-${index}`}
                    className="bg-neutral-950 border border-neutral-800/80 p-2.5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[10px] font-mono text-[#5865F2] bg-neutral-900 px-1.5 py-0.5 border border-neutral-800">
                        ID: {player.id}
                      </span>
                      <span className="text-neutral-200 font-semibold truncate">{player.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-500 shrink-0">
                      {player.ping > 0 ? `${player.ping}ms` : 'Active'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <p className="text-xs text-neutral-400 font-sans">
                  No players currently connected to the server.
                </p>
                <span className="text-[10px] text-neutral-500 font-mono mt-1">
                  Server may be empty or restarting.
                </span>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}