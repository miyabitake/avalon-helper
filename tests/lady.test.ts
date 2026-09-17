import { describe, expect, it } from "vitest";
import { assertLadyTarget, needsLadyInspection } from "@/game/lady";
import { assertActionAllowed } from "@/game/stateMachine";
import { buildPrivateViewForRoom, buildPublicGameState } from "@/game/serializers";

describe("Lady of the Lake", () => {
  it("only interrupts eligible completed rounds before a winning score", () => {
    for (let round = 1; round <= 5; round++) {
      expect(needsLadyInspection(round, "p1", 2, 2)).toBe([2, 3, 4].includes(round));
      expect(needsLadyInspection(round, null, 2, 2)).toBe(false);
      expect(needsLadyInspection(round, "p1", 3, 1)).toBe(false);
      expect(needsLadyInspection(round, "p1", 1, 3)).toBe(false);
    }
  });

  it("rejects non-holders, self and every previous holder", () => {
    expect(() => assertLadyTarget("p3", ["p1", "p2"], "p4", "p5")).toThrow();
    for (const target of ["p1", "p2", "p3"]) {
      expect(() => assertLadyTarget("p3", ["p1", "p2"], "p3", target)).toThrow();
    }
    expect(() => assertLadyTarget("p3", ["p1", "p2"], "p3", "p4")).not.toThrow();
  });

  it("pauses regular play but permits assassination", () => {
    expect(() => assertActionAllowed("LADY_INSPECTION", "INSPECT_LADY")).not.toThrow();
    expect(() => assertActionAllowed("LADY_INSPECTION", "CALL_ASSASSINATION")).not.toThrow();
    for (const action of ["PROPOSE_TEAM", "VOTE_TEAM", "SUBMIT_QUEST", "FORCE_PROGRESS", "ROLLBACK"] as const) {
      expect(() => assertActionAllowed("LADY_INSPECTION", action)).toThrow();
    }
    expect(() => assertActionAllowed("TEAM_PROPOSAL", "INSPECT_LADY")).toThrow();
    expect(() => assertActionAllowed("GAME_OVER", "INSPECT_LADY")).toThrow();
  });

  it("only gives the inspector the alignment, including Oberon and Mordred", () => {
    const room: Parameters<typeof buildPublicGameState>[0] = {
      id: "room", code: "LADY10", status: "LADY_INSPECTION", isLocked: true,
      hostPlayerId: "p0", currentRound: 4, proposalAttempt: 1, currentLeaderIndex: 0,
      goodQuestWins: 2, evilQuestWins: 2, winner: null, gameOverReason: null,
      assassinationMode: null, enabledRoles: null, createdAt: new Date(), updatedAt: new Date(),
      ladyHolderId: "p2", ladyPreviousHolders: ["p0", "p1"],
      ladyRecords: [
        { round: 2, inspectorId: "p0", targetId: "p1", alignment: "EVIL" },
        { round: 3, inspectorId: "p1", targetId: "p2", alignment: "EVIL" }
      ],
      players: Array.from({ length: 10 }, (_, i) => ({
        id: `p${i}`, roomId: "room", nickname: `Player ${i}`, seatIndex: i, isHost: i === 0,
        role: i === 1 ? "OBERON" : i === 2 ? "MORDRED" : "LOYAL_SERVANT",
        alignment: i === 1 || i === 2 ? "EVIL" : "GOOD",
        sessionToken: `secret${i}`, isConnected: true, hasViewedRole: true,
        lastSeenAt: new Date(), createdAt: new Date()
      })), proposals: [], quests: [], assassination: null
    };
    expect(buildPublicGameState(room).lady.history).toEqual([
      { round: 2, inspectorId: "p0", targetId: "p1" },
      { round: 3, inspectorId: "p1", targetId: "p2" }
    ]);
    expect(buildPrivateViewForRoom(room, "p0").ladyResults).toEqual([{ round: 2, targetId: "p1", alignment: "EVIL" }]);
    expect(buildPrivateViewForRoom(room, "p1").ladyResults).toEqual([{ round: 3, targetId: "p2", alignment: "EVIL" }]);
    expect(buildPrivateViewForRoom(room, "p2").ladyResults).toEqual([]);
    expect(buildPrivateViewForRoom(room, "p2").allowedActions).toContain("INSPECT_LADY");
    expect(buildPrivateViewForRoom(room, "p0").allowedActions).not.toContain("INSPECT_LADY");
  });
});
