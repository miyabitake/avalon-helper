import { loadEnvConfig } from "@next/env";
import { expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createRoom, joinRoom } from "@/game/roomService";
import { ackRole, getLoadedRoom, getState, inspectLady, proposeTeam, restartGame, startGame, submitQuest, voteTeam, callAssassination, assassinate } from "@/game/gameService";

it.skipIf(process.env.RUN_DB_TESTS !== "1")("runs a ten-player game with persisted private inspections and restart", async () => {
  loadEnvConfig(process.cwd());
  const auth = await createRoom("Lady integration test");
  try {
    for (let i = 1; i < 10; i++) await joinRoom(auth.roomCode, `Test ${i}`);
    let room = await getLoadedRoom(auth.roomCode);
    const host = room.players[0];
    await startGame(room.code, host);
    room = await getLoadedRoom(room.code);
    expect(room.ladyHolderId).toBe(room.players[(room.currentLeaderIndex + 9) % 10].id);
    for (const player of room.players) await ackRole(room.code, player);
    for (let round = 1; round <= 4; round++) {
      room = await getLoadedRoom(room.code);
      const evil = room.players.find((p) => p.alignment === "EVIL")!;
      const size = [3, 4, 4, 5][round - 1];
      const team = [evil, ...room.players.filter((p) => p.id !== evil.id)].slice(0, size);
      await proposeTeam(room.code, room.players[room.currentLeaderIndex], team.map((p) => p.id));
      room = await getLoadedRoom(room.code);
      const proposal = room.proposals.find((p) => p.round === round)!;
      for (const player of room.players) await voteTeam(room.code, player, proposal.id, "APPROVE");
      room = await getLoadedRoom(room.code);
      const quest = room.quests.find((q) => q.round === round)!;
      for (const player of team) await submitQuest(room.code, player, quest.id, round % 2 === 1 && player.id === evil.id ? "FAIL" : "SUCCESS");
      room = await getLoadedRoom(room.code);
      if (round === 1) { expect(room.status).toBe("TEAM_PROPOSAL"); continue; }
      expect(room.status).toBe("LADY_INSPECTION");
      const holder = room.players.find((p) => p.id === room.ladyHolderId)!;
      const target = room.players.find((p) => p.id !== holder.id && !room.ladyPreviousHolders.includes(p.id))!;
      await expect(inspectLady(room.code, target, holder.id, round)).rejects.toThrow();
      await expect(inspectLady(room.code, holder, holder.id, round)).rejects.toThrow();
      const attempts = await Promise.allSettled([
        inspectLady(room.code, holder, target.id, round), inspectLady(room.code, holder, target.id, round)
      ]);
      expect(attempts.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      const state = await getState(room.code, holder.id);
      expect(state.publicState.currentRound).toBe(round + 1);
      expect(state.publicState.lady.holderId).toBe(target.id);
      expect(state.privateView.ladyResults).toContainEqual({ round, targetId: target.id, alignment: target.alignment });
      expect(JSON.stringify(state.publicState.lady)).not.toContain("alignment");
      expect((await getState(room.code, target.id)).privateView.ladyResults).toEqual([]);
    }
    room = await getLoadedRoom(room.code);
    const assassin = room.players.find((p) => p.role === "ASSASSIN")!;
    await callAssassination(room.code, assassin);
    await assassinate(room.code, assassin, room.players.find((p) => p.role === "MERLIN")!.id);
    await restartGame(room.code, host);
    room = await getLoadedRoom(room.code);
    expect(room.ladyHolderId).toBeNull();
    expect(room.ladyPreviousHolders).toEqual([]);
    expect(room.ladyRecords).toEqual([]);
  } finally {
    await prisma.room.deleteMany({ where: { code: auth.roomCode } });
  }
}, 30000);
