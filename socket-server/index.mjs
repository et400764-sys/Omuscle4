import { createServer } from "http";
import { Server } from "socket.io";

const PORT = process.env.PORT ?? process.env.SOCKET_PORT ?? 3003;

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { 
    origin: "*", 
    methods: ["GET", "POST"],
    credentials: true,
  },
  allowEIO3: true,
});

// roomCode → RoomState
const rooms = new Map();

// Arena matchmaking queue
const arenaQueue = []; // Array of socket IDs waiting for arena match

// Player Elo ratings (socket ID → Elo rating)
const playerElo = new Map();
const INITIAL_ELO = 1000;

function generateCode() {
  // No confusable chars (0/O, 1/I/L)
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// Calculate Elo rating change
function calculateElo(winnerElo, loserElo, kFactor = 32) {
  const expectedScore = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const eloChange = Math.round(kFactor * (1 - expectedScore));
  return eloChange;
}

// Get or initialize player Elo
function getPlayerElo(socketId) {
  if (!playerElo.has(socketId)) {
    playerElo.set(socketId, INITIAL_ELO);
  }
  return playerElo.get(socketId);
}

function startCountdown(roomCode) {
  let count = 3;
  io.to(roomCode).emit("phase", { phase: "countdown", count });

  const tick = setInterval(() => {
    count--;
    if (count > 0) {
      io.to(roomCode).emit("phase", { phase: "countdown", count });
    } else {
      clearInterval(tick);
      const room = rooms.get(roomCode);
      if (!room) return;

      room.status = "scanning";
      io.to(roomCode).emit("phase", { phase: "scanning", duration: 90 });

      // Auto-end after 90s (1:30)
      setTimeout(() => {
        const r = rooms.get(roomCode);
        if (!r || r.status !== "scanning") return;

        r.status = "finished";
        const hs = r.scores.host?.score ?? 0;
        const gs = r.scores.guest?.score ?? 0;
        const winner = hs > gs ? "host" : gs > hs ? "guest" : "draw";

        // Calculate Elo changes
        const hostElo = getPlayerElo(r.host);
        const guestElo = getPlayerElo(r.guest);
        let hostEloChange = 0;
        let guestEloChange = 0;

        if (winner === "host") {
          hostEloChange = calculateElo(hostElo, guestElo);
          guestEloChange = -hostEloChange;
        } else if (winner === "guest") {
          guestEloChange = calculateElo(guestElo, hostElo);
          hostEloChange = -guestEloChange;
        }

        // Update Elo ratings
        playerElo.set(r.host, hostElo + hostEloChange);
        playerElo.set(r.guest, guestElo + guestEloChange);

        io.to(roomCode).emit("phase", {
          phase:      "finished",
          hostScore:  hs,
          guestScore: gs,
          hostDom:    r.scores.host?.dominant ?? "—",
          guestDom:   r.scores.guest?.dominant ?? "—",
          winner:     winner,
          hostElo:    hostElo + hostEloChange,
          guestElo:   guestElo + guestEloChange,
          hostEloChange,
          guestEloChange,
        });

        // Clean up room after 2 min
        setTimeout(() => rooms.delete(roomCode), 120_000);
        console.log(`Room ${roomCode} finished — host ${hs} vs guest ${gs} (Elo: ${hostElo + hostEloChange} vs ${guestElo + guestEloChange})`);
      }, 90_000);
    }
  }, 1000);
}

io.on("connection", (socket) => {
  let currentRoom = null;
  let role        = null; // "host" | "guest"

  console.log("+ connect", socket.id);

  // ── Create room ──────────────────────────────────────────────────────────
  socket.on("create-room", () => {
    let code;
    do { code = generateCode(); } while (rooms.has(code));

    rooms.set(code, {
      code,
      host:   socket.id,
      guest:  null,
      status: "waiting",                         // waiting → camera-check → countdown → scanning → finished
      ready:  { host: false, guest: false },
      scores: { host: null, guest: null },
    });

    socket.join(code);
    currentRoom = code;
    role        = "host";

    socket.emit("room-created", { code });
    console.log(`Room ${code} created`);
  });

  // ── Join room ─────────────────────────────────────────────────────────────
  socket.on("join-room", ({ code }) => {
    const upper = (code ?? "").toUpperCase().trim();
    const room  = rooms.get(upper);

    if (!room)                   return socket.emit("join-error", "Room not found — check the code");
    if (room.guest)              return socket.emit("join-error", "Room is full");
    if (room.status !== "waiting") return socket.emit("join-error", "Match already started");

    room.guest  = socket.id;
    room.status = "camera-check";
    socket.join(upper);
    currentRoom = upper;
    role        = "guest";

    // Tell both players to move to camera-check phase
    io.to(upper).emit("phase", { phase: "camera-check" });
    console.log(`Room ${upper}: guest joined`);
  });

  // ── Camera check — player signals body is in frame ────────────────────────
  socket.on("player-ready", () => {
    if (!currentRoom || !role) return;
    const room = rooms.get(currentRoom);
    if (!room || room.status !== "camera-check") return;

    room.ready[role] = true;
    io.to(currentRoom).emit("ready-update", { host: room.ready.host, guest: room.ready.guest });

    if (room.ready.host && room.ready.guest) {
      room.status = "countdown";
      startCountdown(currentRoom);
    }
    console.log(`Room ${currentRoom}: ${role} ready (host=${room.ready.host} guest=${room.ready.guest})`);
  });

  // ── Score update during scan ───────────────────────────────────────────────
  socket.on("score-update", ({ score, dominant, flaw }) => {
    if (!currentRoom || !role) return;
    const room = rooms.get(currentRoom);
    if (!room || room.status !== "scanning") return;

    room.scores[role] = { score, dominant, flaw };
    socket.to(currentRoom).emit("opponent-score", { score, dominant, flaw });
  });

  // ── WebRTC signaling relay (peer-to-peer video/audio) ─────────────────────
  socket.on("webrtc-signal", ({ type, payload }) => {
    if (!currentRoom || !role) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    const targetId = role === "host" ? room.guest : room.host;
    if (targetId) io.to(targetId).emit("webrtc-signal", { type, payload });
  });

  // ── Join arena (matchmaking) ───────────────────────────────────────────────
  socket.on("join-arena", () => {
    // Remove from queue if already there
    const queueIndex = arenaQueue.indexOf(socket.id);
    if (queueIndex !== -1) {
      arenaQueue.splice(queueIndex, 1);
    }

    // Add to queue
    arenaQueue.push(socket.id);
    role = "arena";
    
    // Send player's current Elo
    const elo = getPlayerElo(socket.id);
    socket.emit("your-elo", { elo });
    console.log(`Sent Elo to ${socket.id}: ${elo}`);
    
    // Broadcast updated arena count to all clients
    io.emit("arena-count", { count: arenaQueue.length });
    console.log(`Arena queue: ${socket.id} joined (total: ${arenaQueue.length})`);

    // Try to match if there are at least 2 players
    if (arenaQueue.length >= 2) {
      const player1 = arenaQueue.shift();
      const player2 = arenaQueue.shift();
      
      // Create a room for the matched players
      let code;
      do { code = generateCode(); } while (rooms.has(code));

      rooms.set(code, {
        code,
        host: player1,
        guest: player2,
        status: "camera-check",
        ready: { host: false, guest: false },
        scores: { host: null, guest: null },
      });

      // Join both players to the room
      const socket1 = io.sockets.sockets.get(player1);
      const socket2 = io.sockets.sockets.get(player2);
      
      if (socket1) {
        socket1.join(code);
        socket1.emit("arena-matched", { code, role: "host" });
      }
      if (socket2) {
        socket2.join(code);
        socket2.emit("arena-matched", { code, role: "guest" });
      }

      // Update arena count
      io.emit("arena-count", { count: arenaQueue.length });
      
      // Tell both players to move to camera-check phase
      io.to(code).emit("phase", { phase: "camera-check" });
      console.log(`Arena match created: ${code} (${player1} vs ${player2})`);
    }
  });

// ── Leave arena ────────────────────────────────────────────────────────────
  socket.on("leave-arena", () => {
    const queueIndex = arenaQueue.indexOf(socket.id);
    if (queueIndex !== -1) {
      arenaQueue.splice(queueIndex, 1);
      io.emit("arena-count", { count: arenaQueue.length });
      console.log(`Arena queue: ${socket.id} left (total: ${arenaQueue.length})`);
    }
  });

// ── Get leaderboard ────────────────────────────────────────────────────────
  socket.on("get-leaderboard", () => {
    // Convert playerElo Map to array and sort by Elo (descending)
    const leaderboard = Array.from(playerElo.entries())
      .map(([socketId, elo]) => ({ socketId, elo }))
      .sort((a, b) => b.elo - a.elo)
      .slice(0, 10); // Top 10 players
    
    console.log(`Leaderboard requested by ${socket.id}, returning ${leaderboard.length} players`);
    socket.emit("leaderboard", { leaderboard });
  });

// ── Disconnect ────────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    // Remove from arena queue if present
    const queueIndex = arenaQueue.indexOf(socket.id);
    if (queueIndex !== -1) {
      arenaQueue.splice(queueIndex, 1);
      io.emit("arena-count", { count: arenaQueue.length });
    }

    if (currentRoom) {
      io.to(currentRoom).emit("phase", { phase: "error", reason: "Opponent disconnected" });
      rooms.delete(currentRoom);
      console.log(`Room ${currentRoom} deleted — ${socket.id} left`);
    }
    console.log("- disconnect", socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🔌  Omuscle socket server  →  http://localhost:${PORT}`);
});
