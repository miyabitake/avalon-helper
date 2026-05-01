import type { Server } from "socket.io";

const globalSocket = globalThis as unknown as { io?: Server };

export function setSocketServer(io: Server) {
  globalSocket.io = io;
}

export function broadcastRoomUpdate(roomCode: string) {
  globalSocket.io?.to(roomCode).emit("room:update", { roomCode });
}

