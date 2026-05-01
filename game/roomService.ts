import { prisma } from "@/lib/prisma";
import { createRoomCode, createSessionToken } from "@/lib/auth";
import { GameError, type AuthPayload } from "@/types/game";
import { assertActionAllowed } from "@/game/stateMachine";

export async function createRoom(nickname: string): Promise<AuthPayload> {
  const cleanName = nickname.trim().slice(0, 20);
  if (!cleanName) throw new GameError("INVALID_NICKNAME", "昵称不能为空。");

  for (let i = 0; i < 5; i += 1) {
    const code = createRoomCode();
    const existing = await prisma.room.findUnique({ where: { code } });
    if (existing) continue;
    const sessionToken = createSessionToken();
    const room = await prisma.room.create({
      data: {
        code,
        players: {
          create: {
            nickname: cleanName,
            seatIndex: 0,
            isHost: true,
            sessionToken
          }
        }
      },
      include: { players: true }
    });
    const host = room.players[0];
    await prisma.room.update({ where: { id: room.id }, data: { hostPlayerId: host.id } });
    return { roomCode: room.code, playerId: host.id, sessionToken };
  }

  throw new GameError("ROOM_CODE_COLLISION", "房间码生成失败，请重试。");
}

export async function joinRoom(code: string, nickname: string): Promise<AuthPayload> {
  const cleanName = nickname.trim().slice(0, 20);
  if (!cleanName) throw new GameError("INVALID_NICKNAME", "昵称不能为空。");
  const room = await prisma.room.findUnique({ where: { code }, include: { players: true } });
  if (!room) throw new GameError("ROOM_NOT_FOUND", "房间不存在。", 404);
  if (room.status !== "LOBBY") throw new GameError("GAME_ALREADY_STARTED", "游戏已开始，不能加入。");
  if (room.isLocked) throw new GameError("ROOM_LOCKED", "房间已锁定。");
  if (room.players.length >= 10) throw new GameError("ROOM_FULL", "房间人数已满。");

  const sessionToken = createSessionToken();
  const player = await prisma.player.create({
    data: {
      roomId: room.id,
      nickname: cleanName,
      seatIndex: room.players.length,
      sessionToken
    }
  });

  return { roomCode: room.code, playerId: player.id, sessionToken };
}

export async function reconnectRoom(code: string, playerId: string, sessionToken: string): Promise<AuthPayload> {
  const room = await prisma.room.findUnique({ where: { code }, include: { players: true } });
  if (!room) throw new GameError("ROOM_NOT_FOUND", "房间不存在。", 404);
  const player = room.players.find((item) => item.id === playerId && item.sessionToken === sessionToken);
  if (!player) throw new GameError("INVALID_SESSION", "玩家身份验证失败。", 401);
  await prisma.player.update({
    where: { id: player.id },
    data: { isConnected: true, lastSeenAt: new Date() }
  });
  return { roomCode: code, playerId, sessionToken };
}

export async function setPlayerConnection(playerId: string, isConnected: boolean) {
  await prisma.player.update({
    where: { id: playerId },
    data: { isConnected, lastSeenAt: new Date() }
  });
}

export async function leaveRoom(code: string, actor: { id: string }) {
  const room = await prisma.room.findUnique({
    where: { code },
    include: { players: { orderBy: { seatIndex: "asc" } } }
  });
  if (!room) throw new GameError("ROOM_NOT_FOUND", "房间不存在。", 404);
  const player = room.players.find((item) => item.id === actor.id);
  if (!player) throw new GameError("PLAYER_NOT_FOUND", "玩家不存在。", 404);

  if (room.status === "LOBBY") {
    await prisma.$transaction(async (tx) => {
      await tx.player.delete({ where: { id: player.id } });
      const remaining = room.players.filter((item) => item.id !== player.id);
      if (!remaining.length) {
        await tx.room.delete({ where: { id: room.id } });
        return;
      }
      for (const [index, item] of remaining.entries()) {
        await tx.player.update({ where: { id: item.id }, data: { seatIndex: index, isHost: index === 0 } });
      }
      await tx.room.update({ where: { id: room.id }, data: { hostPlayerId: remaining[0].id } });
    });
    return;
  }

  if (room.status !== "GAME_OVER") {
    await prisma.$transaction([
      prisma.player.update({
        where: { id: player.id },
        data: { isConnected: false, lastSeenAt: new Date() }
      }),
      prisma.room.update({
        where: { id: room.id },
        data: { status: "GAME_OVER", winner: null, gameOverReason: "PLAYER_LEFT", isLocked: true }
      })
    ]);
  }
}

export async function setRoomLocked(code: string, actor: { isHost: boolean }, isLocked: boolean) {
  if (!actor.isHost) throw new GameError("HOST_ONLY", "只有房主可以执行该操作。", 403);
  const room = await prisma.room.findUnique({ where: { code } });
  if (!room) throw new GameError("ROOM_NOT_FOUND", "房间不存在。", 404);
  assertActionAllowed(room.status, isLocked ? "LOCK" : "UNLOCK");
  await prisma.room.update({ where: { id: room.id }, data: { isLocked } });
}

export async function removePlayer(code: string, actor: { id: string; isHost: boolean }, targetPlayerId: string) {
  if (!actor.isHost) throw new GameError("HOST_ONLY", "只有房主可以执行该操作。", 403);
  const room = await prisma.room.findUnique({ where: { code }, include: { players: { orderBy: { seatIndex: "asc" } } } });
  if (!room) throw new GameError("ROOM_NOT_FOUND", "房间不存在。", 404);
  assertActionAllowed(room.status, "REMOVE_PLAYER");
  if (actor.id === targetPlayerId) throw new GameError("CANNOT_REMOVE_HOST", "房主不能移除自己。");
  const target = room.players.find((player) => player.id === targetPlayerId);
  if (!target) throw new GameError("PLAYER_NOT_FOUND", "玩家不存在。", 404);
  if (room.status !== "LOBBY") {
    await prisma.room.update({
      where: { id: room.id },
      data: { status: "GAME_OVER", winner: null, gameOverReason: "PLAYER_LEFT", isLocked: true }
    });
    return;
  }
  await prisma.$transaction(async (tx) => {
    await tx.player.delete({ where: { id: target.id } });
    const remaining = room.players.filter((player) => player.id !== target.id);
    for (const [index, player] of remaining.entries()) {
      await tx.player.update({ where: { id: player.id }, data: { seatIndex: index } });
    }
  });
}
