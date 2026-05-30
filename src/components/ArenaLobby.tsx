"use client";

import { useState, useEffect } from "react";

interface Props {
  connected: boolean;
  arenaCount: number;
  inArena: boolean;
  onJoin: () => void;
  onLeave: () => void;
  error: string | null;
}

export default function ArenaLobby({ connected, arenaCount, inArena, onJoin, onLeave, error }: Props) {
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (inArena) {
      setSearching(true);
    } else {
      setSearching(false);
    }
  }, [inArena]);

  function handleJoin() {
    setSearching(true);
    onJoin();
  }

  function handleLeave() {
    setSearching(false);
    onLeave();
  }

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col">
      {/* Header with back button */}
      <div className="flex items-center h-12 border-b border-zinc-900 px-4">
        <a href="/" className="text-zinc-500 hover:text-white transition-colors text-sm flex items-center gap-1">← Home</a>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="text-[#00ff88] text-xs tracking-widest uppercase font-bold">Live Arena</div>
            <h1 className="text-3xl font-black tracking-tight">Enter the Arena</h1>
            <p className="text-zinc-500 text-sm">
              Get matched with opponents waiting in the arena. First to join gets matched first.
            </p>
          </div>

        {/* Connection indicator */}
        <div className="flex items-center justify-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? "bg-[#00ff88]" : "bg-zinc-600 animate-pulse"}`} />
          <span className="text-xs text-zinc-600">{connected ? "Connected to arena server" : "Connecting…"}</span>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Live counter */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-zinc-600 text-xs tracking-widest uppercase">Players in arena</div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${arenaCount > 0 ? "bg-[#00ff88] animate-pulse" : "bg-zinc-700"}`} />
              <span className="text-xs text-zinc-500">{arenaCount > 0 ? "Live" : "Empty"}</span>
            </div>
          </div>
          <div className="text-6xl font-black tracking-tight text-white tabular-nums">
            {arenaCount}
          </div>
          <div className="text-zinc-600 text-xs">
            {arenaCount === 0 && "No players waiting"}
            {arenaCount === 1 && "1 player waiting for opponent"}
            {arenaCount >= 2 && `${arenaCount} players in queue`}
          </div>
        </div>

        {/* Action buttons */}
        {!searching ? (
          <button
            onClick={handleJoin}
            disabled={!connected}
            className="w-full py-6 bg-[#00ff88] text-black font-black tracking-widest uppercase rounded-lg
              hover:bg-[#00e87a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors
              shadow-[0_0_40px_rgba(0,255,136,0.3)] text-xl"
          >
            Join Arena
          </button>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handleLeave}
              className="w-full py-4 border border-zinc-700 text-zinc-300 font-bold tracking-widest uppercase rounded-lg
                hover:border-zinc-500 hover:bg-zinc-900 transition-colors"
            >
              Cancel Search
            </button>
            <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm">
              <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
              Searching for opponent…
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
