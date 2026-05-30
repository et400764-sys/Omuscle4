"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ScoreResult } from "@/lib/scoring";
import { MatchPhase, MatchResult, useSocket } from "@/lib/useSocket";
import { useWebRTC } from "@/lib/useWebRTC";
import BodyScanner from "@/components/BodyScanner";
import ArenaLobby from "@/components/ArenaLobby";

function scoreColor(v: number | null): string {
  if (v === null) return "#52525b";
  if (v >= 8) return "#00ff88";
  if (v >= 6) return "#a3e635";
  if (v >= 4) return "#facc15";
  return "#f87171";
}

// ── Camera check ─────────────────────────────────────────────────────────────
function CameraCheckPhase({
  myReady, opponentReady, onReady, onStream,
}: { myReady: boolean; opponentReady: boolean; onReady: () => void; onStream: (s: MediaStream) => void }) {
  const [bodyInFrame, setBodyInFrame] = useState(false);
  const sentRef = useRef(false);

  const handleReadiness = useCallback((ready: boolean) => {
    setBodyInFrame(ready);
    if (ready && !sentRef.current) {
      sentRef.current = true;
      onReady();
    }
  }, [onReady]);

  return (
    <div className="h-screen bg-[#080808] flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-4 px-4 h-12 border-b border-zinc-900">
        <a href="/" className="text-zinc-500 hover:text-white transition-colors text-sm flex items-center gap-1">← Home</a>
        <div className="flex-1 text-center">
          <span className="text-[#00ff88] text-xs tracking-widest uppercase font-bold">Camera Check</span>
        </div>
        <div className="w-16" />
      </div>

      {/* Camera — fills remaining height */}
      <div className="flex-1 min-h-0 relative">
        <BodyScanner controlled fill onReadinessChange={handleReadiness} onStream={onStream} />
      </div>

      {/* Ready status bar */}
      <div className="shrink-0 border-t border-zinc-900 p-3 grid grid-cols-2 gap-3">
        <div className={`py-2.5 rounded-lg border text-center text-xs font-bold tracking-widest uppercase transition-colors ${
          myReady
            ? "border-[#00ff88] bg-[#00ff88]/10 text-[#00ff88]"
            : bodyInFrame
            ? "border-yellow-500 bg-yellow-500/10 text-yellow-400 animate-pulse"
            : "border-zinc-800 text-zinc-600"
        }`}>
          {myReady ? "✓ You're ready" : bodyInFrame ? "Confirming…" : "Get in frame"}
        </div>
        <div className={`py-2.5 rounded-lg border text-center text-xs font-bold tracking-widest uppercase transition-colors ${
          opponentReady
            ? "border-[#00ff88] bg-[#00ff88]/10 text-[#00ff88]"
            : "border-zinc-800 text-zinc-600"
        }`}>
          {opponentReady ? "✓ Opponent ready" : "Waiting for opponent…"}
        </div>
      </div>
    </div>
  );
}

// ── Countdown ─────────────────────────────────────────────────────────────────
function CountdownOverlay({ count }: { count: number }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-zinc-500 text-sm tracking-widest uppercase">Match starting</div>
        <div
          className="text-[12rem] font-black leading-none tabular-nums"
          style={{ color: "#00ff88", textShadow: "0 0 80px rgba(0,255,136,0.5)" }}
        >
          {count}
        </div>
      </div>
    </div>
  );
}

// ── Scan battle ───────────────────────────────────────────────────────────────
function ScanBattle({
  opponentScore, opponentDom, opponentFlaw,
  onScore, onStream, timeLeft, remoteStream,
}: {
  opponentScore: number | null;
  opponentDom: string | null;
  opponentFlaw: string | null;
  onScore: (r: ScoreResult) => void;
  onStream: (s: MediaStream) => void;
  timeLeft: number;
  remoteStream: MediaStream | null;
}) {
  const [myScore, setMyScore] = useState<number | null>(null);
  const [myDom,   setMyDom]   = useState<string | null>(null);
  const [myFlaw,  setMyFlaw]  = useState<string | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Secret cheat mode
  const [showSecretBtn, setShowSecretBtn] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [cheatMode, setCheatMode] = useState(false);
  const [customMyScore, setCustomMyScore] = useState("");
  const [customOppScore, setCustomOppScore] = useState("");

  // Attach remote stream: video element (muted) + separate audio element (unmuted)
  // Keeping them separate lets video autoplay without browser blocking unmuted content.
  useEffect(() => {
    if (!remoteStream) return;

    // Video — muted so autoplay is never blocked
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }

    // Audio — separate element so browser plays voice through speakers
    const audioTracks = remoteStream.getAudioTracks();
    if (audioTracks.length > 0) {
      const audioOnlyStream = new MediaStream(audioTracks);
      const audioEl = new Audio();
      audioEl.srcObject = audioOnlyStream;
      audioEl.autoplay  = true;
      audioEl.volume    = 1.0;
      audioEl.play().catch(() => {});
      remoteAudioRef.current = audioEl;
    }

    return () => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.pause();
        remoteAudioRef.current.srcObject = null;
        remoteAudioRef.current = null;
      }
    };
  }, [remoteStream]);

  // Battle music — plays on mount, stops on unmount
  useEffect(() => {
    const audio = new Audio("/battle.mp3");
    audio.loop   = true;
    audio.volume = 0.35;
    audio.play().catch(() => {});
    return () => { audio.pause(); audio.src = ""; };
  }, []);

  function handleScore(r: ScoreResult) {
    setMyScore(r.overall);
    setMyDom(r.dominant);
    setMyFlaw(r.flaw);
    onScore(r);
  }

  function handleCodeSubmit() {
    if (codeInput === "479-TUNG") {
      setCheatMode(true);
      setShowCodeModal(false);
      setCodeInput("");
    } else {
      alert("Incorrect code");
      setCodeInput("");
    }
  }

  function applyCheatScores() {
    const myS = parseFloat(customMyScore);
    const oppS = parseFloat(customOppScore);
    if (!isNaN(myS)) setMyScore(myS);
    if (!isNaN(oppS)) {
      // We can't directly set opponentScore here, but we can send a fake score update
      // For now, just update local display
    }
  }

  const myAhead = myScore !== null && opponentScore !== null && myScore > opponentScore;
  const tied    = myScore !== null && opponentScore !== null && myScore === opponentScore;
  const pct     = myScore !== null && opponentScore !== null
    ? (myScore / (myScore + opponentScore)) * 100
    : 50;
  const timerColor = timeLeft <= 5 ? "#f87171" : timeLeft <= 10 ? "#facc15" : "#ffffff";

  return (
    <div className="h-screen bg-[#080808] flex flex-col overflow-hidden">

      {/* ── Top bar: YOU | timer | OPPONENT ── */}
      <div className="shrink-0 grid grid-cols-3 h-11 border-b border-zinc-900 bg-black/80">
        <div className="flex items-center px-4 gap-2">
          <span className="text-xs text-zinc-400 tracking-widest uppercase font-bold">You</span>
          {myScore !== null && (
            <span className="text-sm font-black tabular-nums" style={{ color: scoreColor(myScore) }}>
              {myScore.toFixed(1)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-center gap-2">
          <div
            className="text-xl font-black tabular-nums tracking-widest transition-colors"
            style={{ color: timerColor, textShadow: timeLeft <= 5 ? "0 0 20px rgba(248,113,113,0.6)" : "none" }}
          >
            0:{String(timeLeft).padStart(2, "0")}
          </div>
          {timeLeft <= 5 && <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />}
        </div>
        <div className="flex items-center justify-end px-4 gap-2">
          {opponentScore !== null && (
            <span className="text-sm font-black tabular-nums" style={{ color: scoreColor(opponentScore) }}>
              {opponentScore.toFixed(1)}
            </span>
          )}
          <span className="text-xs text-zinc-400 tracking-widest uppercase font-bold">Opponent</span>
        </div>
      </div>

      {/* ── Main: 50/50 split ── */}
      <div className="flex-1 min-h-0 flex">

        {/* YOUR camera */}
        <div className="flex-1 relative min-w-0 border-r border-zinc-900">
          <BodyScanner controlled fill onScore={handleScore} onStream={onStream} />
          {myScore !== null && (
            <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur border border-zinc-800 rounded-xl px-4 py-3 space-y-1 pointer-events-none">
              <div className="text-3xl font-black leading-none" style={{ color: scoreColor(myScore) }}>
                {myScore.toFixed(1)}
              </div>
              {myDom  && <div className="text-[11px] text-[#00ff88] font-bold truncate max-w-[140px]">DOM: {myDom}</div>}
              {myFlaw && <div className="text-[11px] text-red-400 font-bold truncate max-w-[140px]">FLAW: {myFlaw}</div>}
            </div>
          )}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-black/60 border border-zinc-800 rounded-full pointer-events-none">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
            <span className="text-[9px] text-zinc-400 tracking-widest uppercase">You</span>
          </div>
        </div>

        {/* OPPONENT camera — live WebRTC feed */}
        <div className="flex-1 relative min-w-0 bg-zinc-950 overflow-hidden">
          {/* Live video from opponent via WebRTC */}
          <video
            ref={remoteVideoRef}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            playsInline
            muted // video is muted here; audio plays through separate Audio element above
          />

          {/* Dark overlay to keep overlaid text readable */}
          <div className="absolute inset-0 bg-black/20 pointer-events-none" />

          {/* Connecting state — shown until WebRTC stream arrives */}
          {!remoteStream && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-2 border-zinc-700 animate-ping opacity-25" />
                <div className="absolute inset-2 rounded-full border border-zinc-700 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-600 animate-pulse" />
                </div>
              </div>
              <div className="text-center">
                <div className="text-zinc-500 text-xs font-bold tracking-widest uppercase">Connecting camera…</div>
                <div className="text-zinc-700 text-[10px] mt-1">Establishing peer connection</div>
              </div>
            </div>
          )}

          {/* Opponent score overlay — bottom left of their camera */}
          {opponentScore !== null && (
            <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur border border-zinc-800 rounded-xl px-4 py-3 space-y-1 pointer-events-none">
              <div className="text-3xl font-black leading-none" style={{ color: scoreColor(opponentScore) }}>
                {opponentScore.toFixed(1)}
              </div>
              {opponentDom  && <div className="text-[11px] text-[#00ff88] font-bold truncate max-w-[140px]">DOM: {opponentDom}</div>}
              {opponentFlaw && <div className="text-[11px] text-red-400 font-bold truncate max-w-[140px]">FLAW: {opponentFlaw}</div>}
            </div>
          )}

          {/* Scanning indicator */}
          {!opponentScore && remoteStream && (
            <div className="absolute bottom-3 left-3 bg-black/70 border border-zinc-800 rounded-lg px-3 py-2 pointer-events-none">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                <span className="text-[10px] text-zinc-400 tracking-widest uppercase">Scanning…</span>
              </div>
            </div>
          )}

          {/* LIVE badge */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 bg-black/60 border border-zinc-800 rounded-full pointer-events-none">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[9px] text-zinc-400 tracking-widest uppercase">Opponent</span>
          </div>
        </div>
      </div>

      {/* ── Bottom: score comparison bar ── */}
      <div className="shrink-0 border-t border-zinc-900 h-10 flex items-center px-4 gap-3 bg-black/60">
        <span className="text-xs font-black w-8 tabular-nums text-right" style={{ color: scoreColor(myScore) }}>
          {myScore?.toFixed(1) ?? "—"}
        </span>
        <div className="flex-1 bg-zinc-900 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-1.5 rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: myAhead ? "#00ff88" : tied ? "#facc15" : "#f87171",
            }}
          />
        </div>
        <span className="text-xs font-black w-8 tabular-nums" style={{ color: scoreColor(opponentScore) }}>
          {opponentScore?.toFixed(1) ?? "—"}
        </span>
      </div>

      {/* Secret button */}
      <button
        onClick={() => setShowSecretBtn(!showSecretBtn)}
        className="fixed bottom-4 left-4 w-8 h-8 bg-zinc-900/50 hover:bg-zinc-800/50 rounded-full flex items-center justify-center transition-colors opacity-30 hover:opacity-100"
        title="Secret"
      >
        <div className="w-1 h-1 bg-zinc-600 rounded-full" />
      </button>

      {/* Secret code modal */}
      {showSecretBtn && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-sm space-y-4">
            <div className="text-center">
              <div className="text-white font-bold mb-2">Enter Code</div>
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCodeSubmit()}
                placeholder="Enter code..."
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-700 rounded-lg text-white text-center tracking-widest uppercase focus:outline-none focus:border-[#00ff88]"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowSecretBtn(false); setShowCodeModal(false); setCodeInput(""); }}
                className="flex-1 py-2 border border-zinc-700 text-zinc-400 font-bold tracking-widest uppercase rounded-lg hover:border-zinc-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCodeSubmit}
                className="flex-1 py-2 bg-[#00ff88] text-black font-bold tracking-widest uppercase rounded-lg hover:bg-[#00e87a] transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cheat mode controls */}
      {cheatMode && (
        <div className="fixed bottom-4 left-4 bg-zinc-900 border border-[#00ff88] rounded-xl p-4 space-y-3 shadow-[0_0_30px_rgba(0,255,136,0.2)] z-40">
          <div className="text-[#00ff88] text-xs font-bold tracking-widest uppercase text-center">Cheat Mode Active</div>
          <div className="space-y-2">
            <div>
              <label className="text-zinc-500 text-xs block mb-1">Your Score</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={customMyScore}
                onChange={(e) => setCustomMyScore(e.target.value)}
                placeholder={myScore?.toFixed(1) ?? "—"}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#00ff88]"
              />
            </div>
            <div>
              <label className="text-zinc-500 text-xs block mb-1">Opponent Score</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={customOppScore}
                onChange={(e) => setCustomOppScore(e.target.value)}
                placeholder={opponentScore?.toFixed(1) ?? "—"}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#00ff88]"
              />
            </div>
          </div>
          <button
            onClick={applyCheatScores}
            className="w-full py-2 bg-[#00ff88] text-black font-bold tracking-widest uppercase rounded-lg hover:bg-[#00e87a] transition-colors text-sm"
          >
            Apply Scores
          </button>
          <button
            onClick={() => setCheatMode(false)}
            className="w-full py-2 border border-zinc-700 text-zinc-400 font-bold tracking-widest uppercase rounded-lg hover:border-zinc-500 transition-colors text-sm"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

// ── Results ───────────────────────────────────────────────────────────────────
function ResultsScreen({
  result, role, onPlayAgain,
}: { result: MatchResult; role: "host" | "guest" | null; onPlayAgain: () => void }) {
  const myScore  = role === "host" ? result.hostScore  : result.guestScore;
  const oppScore = role === "host" ? result.guestScore : result.hostScore;
  const myDom    = role === "host" ? result.hostDom    : result.guestDom;
  const oppDom   = role === "host" ? result.guestDom   : result.hostDom;
  const myElo    = role === "host" ? result.hostElo    : result.guestElo;
  const oppElo   = role === "host" ? result.guestElo   : result.hostElo;
  const myEloChange = role === "host" ? result.hostEloChange : result.guestEloChange;
  const oppEloChange = role === "host" ? result.guestEloChange : result.hostEloChange;
  const won      = result.winner === role;
  const draw     = result.winner === "draw";

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col">
      <div className="flex items-center h-12 border-b border-zinc-900 px-4">
        <a href="/" className="text-zinc-500 hover:text-white transition-colors text-sm flex items-center gap-1">← Home</a>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Outcome */}
        <div className="space-y-2">
          <div
            className="text-6xl font-black tracking-tight"
            style={{ color: draw ? "#facc15" : won ? "#00ff88" : "#f87171" }}
          >
            {draw ? "DRAW" : won ? "YOU WON" : "YOU LOST"}
          </div>
          {!draw && (
            <p className="text-zinc-500 text-sm">
              {won ? "Your proportions are dominant." : "They had better proportions this time."}
            </p>
          )}
        </div>

        {/* Score comparison */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900 rounded-xl p-5 space-y-2">
            <div className="text-[10px] text-zinc-500 tracking-widest uppercase">You</div>
            <div className="text-4xl font-black" style={{ color: scoreColor(myScore) }}>
              {myScore.toFixed(1)}
            </div>
            {myDom !== "—" && <div className="text-xs text-zinc-500">DOM: <span className="text-[#00ff88]">{myDom}</span></div>}
            {myElo !== undefined && (
              <div className="text-xs text-zinc-500">
                Elo: <span className="text-white font-bold">{myElo}</span>
                {myEloChange !== undefined && (
                  <span className={`ml-1 ${myEloChange > 0 ? "text-[#00ff88]" : myEloChange < 0 ? "text-red-400" : "text-zinc-500"}`}>
                    {myEloChange > 0 ? "+" : ""}{myEloChange}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="bg-zinc-900 rounded-xl p-5 space-y-2">
            <div className="text-[10px] text-zinc-500 tracking-widest uppercase">Opponent</div>
            <div className="text-4xl font-black" style={{ color: scoreColor(oppScore) }}>
              {oppScore.toFixed(1)}
            </div>
            {oppDom !== "—" && <div className="text-xs text-zinc-500">DOM: <span className="text-[#00ff88]">{oppDom}</span></div>}
            {oppElo !== undefined && (
              <div className="text-xs text-zinc-500">
                Elo: <span className="text-white font-bold">{oppElo}</span>
                {oppEloChange !== undefined && (
                  <span className={`ml-1 ${oppEloChange > 0 ? "text-[#00ff88]" : oppEloChange < 0 ? "text-red-400" : "text-zinc-500"}`}>
                    {oppEloChange > 0 ? "+" : ""}{oppEloChange}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <a
            href="/arena"
            className="flex-1 py-3 bg-[#00ff88] text-black font-black tracking-widest uppercase rounded-lg
              hover:bg-[#00e87a] transition-colors text-center text-sm"
          >
            Arena Again
          </a>
          <a
            href="/"
            className="flex-1 py-3 border border-zinc-700 text-zinc-300 font-bold tracking-widest uppercase rounded-lg
              hover:border-zinc-500 hover:bg-zinc-900 transition-colors text-center text-sm"
          >
            Home
          </a>
        </div>
      </div>
      </div>
    </div>
  );
}

// ── Root ArenaRoom ─────────────────────────────────────────────────────────────
export default function ArenaRoom() {
  const {
    connected, connTimeout, phase, roomCode, countdown,
    opponentScore, opponentDom, opponentFlaw,
    myReady, opponentReady, result, error, role,
    socketRef,
    arenaCount, inArena, joinArena, leaveArena,
    sendReady, sendScore,
    myElo, leaderboard, getLeaderboard,
  } = useSocket();

  // WebRTC — active during camera-check, countdown, and scanning
  const webrtcActive = phase === "camera-check" || phase === "countdown" || phase === "scanning";
  const { remoteStream, setLocalStream } = useWebRTC(socketRef, role, webrtcActive);

  const [timeLeft, setTimeLeft]  = useState(15);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start countdown timer when scanning begins
  useEffect(() => {
    if (phase === "scanning") {
      setTimeLeft(15);
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) { clearInterval(timerRef.current!); return 0; }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const handleScore = useCallback((r: ScoreResult) => {
    sendScore(r.overall, r.dominant, r.flaw);
  }, [sendScore]);

  // ── Error ──────────────────────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center px-6">
        <div className="text-center space-y-4">
          <div className="text-red-400 font-black text-xl">{error ?? "Something went wrong"}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 border border-zinc-700 text-zinc-300 font-bold tracking-widest uppercase rounded-lg hover:border-zinc-500 transition-colors"
          >
            Back to lobby
          </button>
        </div>
      </div>
    );
  }

  // ── Idle — arena lobby ─────────────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <ArenaLobby
        connected={connected}
        arenaCount={arenaCount}
        inArena={inArena}
        onJoin={joinArena}
        onLeave={leaveArena}
        error={error}
        myElo={myElo}
        leaderboard={leaderboard}
        onGetLeaderboard={getLeaderboard}
      />
    );
  }

  // ── Camera check ───────────────────────────────────────────────────────────
  if (phase === "camera-check") return (
    <CameraCheckPhase myReady={myReady} opponentReady={opponentReady} onReady={sendReady} onStream={setLocalStream} />
  );

  // ── Countdown ──────────────────────────────────────────────────────────────
  if (phase === "countdown") return (
    <>
      <CameraCheckPhase myReady={myReady} opponentReady={opponentReady} onReady={sendReady} onStream={setLocalStream} />
      <CountdownOverlay count={countdown} />
    </>
  );

  // ── Scanning ───────────────────────────────────────────────────────────────
  if (phase === "scanning") return (
    <ScanBattle
      opponentScore={opponentScore}
      opponentDom={opponentDom}
      opponentFlaw={opponentFlaw}
      onScore={handleScore}
      onStream={setLocalStream}
      timeLeft={timeLeft}
      remoteStream={remoteStream}
    />
  );

  // ── Finished ───────────────────────────────────────────────────────────────
  if (phase === "finished" && result) return (
    <ResultsScreen
      result={result}
      role={role}
      onPlayAgain={() => window.location.href = "/arena"}
    />
  );

  return null;
}
