"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type MatchPhase =
  | "idle"
  | "waiting"
  | "camera-check"
  | "countdown"
  | "scanning"
  | "finished"
  | "error";

export interface MatchResult {
  hostScore:  number;
  guestScore: number;
  hostDom:    string;
  guestDom:   string;
  winner:     "host" | "guest" | "draw";
  hostElo?:    number;
  guestElo?:   number;
  hostEloChange?: number;
  guestEloChange?: number;
}

export interface ReadyState {
  host:  boolean;
  guest: boolean;
}

export function useSocket() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const socketRef     = useRef<any>(null);
  const roleRef       = useRef<"host" | "guest" | null>(null);

  const [connected,      setConnected]      = useState(false);
  const [phase,          setPhase]          = useState<MatchPhase>("idle");
  const [roomCode,       setRoomCode]       = useState<string | null>(null);
  const [countdown,      setCountdown]      = useState(3);
  const [opponentScore,  setOpponentScore]  = useState<number | null>(null);
  const [opponentDom,    setOpponentDom]    = useState<string | null>(null);
  const [opponentFlaw,   setOpponentFlaw]   = useState<string | null>(null);
  const [readyState,     setReadyState]     = useState<ReadyState>({ host: false, guest: false });
  const [result,         setResult]         = useState<MatchResult | null>(null);
  const [error,          setError]          = useState<string | null>(null);
  const [connTimeout,    setConnTimeout]    = useState(false);
  const [arenaCount,     setArenaCount]     = useState(0);
  const [inArena,        setInArena]        = useState(false);
  const [myElo,          setMyElo]          = useState<number | null>(null);
  const [leaderboard,    setLeaderboard]    = useState<Array<{socketId: string; elo: number}>>([]);

  useEffect(() => {
    let mounted = true;

    import("socket.io-client").then(({ io }) => {
      if (!mounted) return;

      const SOCKET_URL =
        process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3003";

      const socket = io(SOCKET_URL, { 
        transports: ["websocket", "polling"],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
      });
      socketRef.current = socket;

      socket.on("connect",    () => { 
        setConnected(true); 
        setConnTimeout(false); 
      });
      socket.on("disconnect", () => { setConnected(false); setPhase("error"); setError("Connection lost"); });
      socket.on("connect_error", (err: any) => {
        console.error("Socket connection error:", err);
        setError(`Connection error: ${err.message || err.description || 'Unknown error'}`);
        setConnTimeout(true);
      });

      socket.on("room-created", ({ code }: { code: string }) => {
        setRoomCode(code);
        setPhase("waiting");
      });

      socket.on("join-error", (msg: string) => {
        setError(msg);
        setPhase("idle");
      });

      socket.on("phase", (data: {
        phase: string; count?: number; duration?: number;
        hostScore?: number; guestScore?: number;
        hostDom?: string; guestDom?: string;
        winner?: string; reason?: string;
        hostElo?: number; guestElo?: number;
        hostEloChange?: number; guestEloChange?: number;
      }) => {
        const p = data.phase as MatchPhase;
        setPhase(p);
        if (p === "countdown" && data.count !== undefined) setCountdown(data.count);
        if (p === "finished") {
          setResult({
            hostScore:  data.hostScore  ?? 0,
            guestScore: data.guestScore ?? 0,
            hostDom:    data.hostDom    ?? "—",
            guestDom:   data.guestDom   ?? "—",
            winner:     (data.winner as "host" | "guest" | "draw") ?? "draw",
            hostElo:    data.hostElo,
            guestElo:   data.guestElo,
            hostEloChange: data.hostEloChange,
            guestEloChange: data.guestEloChange,
          });
        }
        if (p === "error") setError(data.reason ?? "Something went wrong");
      });

      socket.on("ready-update", (state: ReadyState) => {
        setReadyState(state);
      });

      socket.on("opponent-score", ({ score, dominant, flaw }: {
        score: number; dominant: string; flaw: string
      }) => {
        setOpponentScore(score);
        setOpponentDom(dominant);
        setOpponentFlaw(flaw);
      });

      socket.on("arena-count", ({ count }: { count: number }) => {
        setArenaCount(count);
      });

      socket.on("arena-matched", ({ code, role: matchedRole }: { code: string; role: "host" | "guest" }) => {
        setRoomCode(code);
        roleRef.current = matchedRole;
        setInArena(false);
      });

      socket.on("your-elo", ({ elo }: { elo: number }) => {
        setMyElo(elo);
      });

      socket.on("leaderboard", ({ leaderboard }: { leaderboard: Array<{socketId: string; elo: number}> }) => {
        setLeaderboard(leaderboard);
      });
    });

    return () => {
      mounted = false;
      socketRef.current?.disconnect();
    };
  }, []);

  const createRoom = useCallback(() => {
    roleRef.current = "host";
    setError(null);
    setPhase("waiting");
    socketRef.current?.emit("create-room");
  }, []);

  const joinRoom = useCallback((code: string) => {
    roleRef.current = "guest";
    setError(null);
    setPhase("waiting");
    socketRef.current?.emit("join-room", { code: code.toUpperCase().trim() });
  }, []);

  const sendReady = useCallback(() => {
    socketRef.current?.emit("player-ready");
  }, []);

  const sendScore = useCallback((score: number, dominant: string, flaw: string) => {
    socketRef.current?.emit("score-update", { score, dominant, flaw });
  }, []);

  const joinArena = useCallback(() => {
    setError(null);
    setInArena(true);
    socketRef.current?.emit("join-arena");
  }, []);

  const leaveArena = useCallback(() => {
    setInArena(false);
    socketRef.current?.emit("leave-arena");
  }, []);

  const getLeaderboard = useCallback(() => {
    socketRef.current?.emit("get-leaderboard");
  }, []);

  const myReady = readyState[roleRef.current ?? "host"];
  const opponentReady = readyState[roleRef.current === "host" ? "guest" : "host"];

  return {
    connected,
    connTimeout,
    phase,
    roomCode,
    countdown,
    opponentScore,
    opponentDom,
    opponentFlaw,
    myReady,
    opponentReady,
    result,
    error,
    role: roleRef.current,
    socketRef,  // exposed for WebRTC signaling
    createRoom,
    joinRoom,
    sendReady,
    sendScore,
    arenaCount,
    inArena,
    joinArena,
    leaveArena,
    myElo,
    leaderboard,
    getLeaderboard,
  };
}
