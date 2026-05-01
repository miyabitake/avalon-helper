import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { GameError } from "@/types/game";

export function createSessionToken() {
  return randomBytes(32).toString("hex");
}

export function createRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export async function requirePlayer(code: string, playerId: string | null | undefined, sessionToken: string | null | undefined) {
  if (!playerId || !sessionToken) throw new GameError("UNAUTHENTICATED", "缺少玩家身份。", 401);
  const room = await prisma.room.findUnique({ where: { code }, include: { players: { orderBy: { seatIndex: "asc" } } } });
  if (!room) throw new GameError("ROOM_NOT_FOUND", "房间不存在。", 404);
  const player = room.players.find((item) => item.id === playerId && item.sessionToken === sessionToken);
  if (!player) throw new GameError("INVALID_SESSION", "玩家身份验证失败。", 401);
  return { room, player };
}

export function assertHost(player: { isHost: boolean }) {
  if (!player.isHost) throw new GameError("HOST_ONLY", "只有房主可以执行该操作。", 403);
}

