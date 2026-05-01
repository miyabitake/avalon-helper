const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");

const dev = process.env.NODE_ENV !== "production";
// In hosted environments like Railway, HOSTNAME is often set to a container
// identifier rather than a bindable public interface. Bind production traffic
// to 0.0.0.0 explicitly so the platform router can reach the app.
const hostname = dev ? "127.0.0.1" : "0.0.0.0";
const port = Number(process.env.PORT || 3000);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
const prisma = new PrismaClient();

app.prepare().then(() => {
  const httpServer = createServer(handle);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  globalThis.io = io;

  io.on("connection", (socket) => {
    socket.on("room:join", async (auth) => {
      try {
        if (!auth?.roomCode || !auth?.playerId || !auth?.sessionToken) return;
        const room = await prisma.room.findUnique({
          where: { code: auth.roomCode },
          include: { players: true }
        });
        const player = room?.players.find(
          (item) => item.id === auth.playerId && item.sessionToken === auth.sessionToken
        );
        if (!room || !player) return;
        socket.data.playerId = player.id;
        socket.data.roomCode = room.code;
        socket.join(room.code);
        await prisma.player.update({
          where: { id: player.id },
          data: { isConnected: true, lastSeenAt: new Date() }
        });
        io.to(room.code).emit("room:update", { roomCode: room.code });
      } catch (error) {
        console.error(error);
      }
    });

    socket.on("disconnect", async () => {
      try {
        if (!socket.data.playerId) return;
        await prisma.player.update({
          where: { id: socket.data.playerId },
          data: { isConnected: false, lastSeenAt: new Date() }
        });
        if (socket.data.roomCode) {
          io.to(socket.data.roomCode).emit("room:update", { roomCode: socket.data.roomCode });
        }
      } catch (error) {
        console.error(error);
      }
    });
  });

  httpServer.listen(port, hostname, () => {
    console.log(`Avalon Helper listening on http://${hostname}:${port}`);
  });
});
