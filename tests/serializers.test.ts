import { describe, expect, it } from "vitest";
import { buildPublicGameState } from "@/game/serializers";

function room(status: "LOBBY" | "TEAM_PROPOSAL") {
  return {
    id: "room",
    ladyHolderId: null,
    ladyPreviousHolders: [],
    ladyRecords: [],
    code: "ABC123",
    status,
    isLocked: false,
    hostPlayerId: "p1",
    currentRound: 1,
    proposalAttempt: 1,
    currentLeaderIndex: 0,
    goodQuestWins: 0,
    evilQuestWins: 0,
    winner: null,
    gameOverReason: null,
    assassinationMode: null,
    enabledRoles: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    assassination: null,
    players: Array.from({ length: 5 }, (_, index) => ({
      id: `p${index + 1}`,
      roomId: "room",
      nickname: `玩家${index + 1}`,
      seatIndex: index,
      isHost: index === 0,
      role: null,
      alignment: null,
      sessionToken: `token-${index + 1}`,
      isConnected: true,
      hasViewedRole: false,
      lastSeenAt: new Date(),
      createdAt: new Date()
    })),
    proposals: [],
    quests: []
  };
}

describe("public state serialization", () => {
  it("does not expose a leader before the game reaches proposal phase", () => {
    expect(buildPublicGameState(room("LOBBY")).currentLeaderId).toBeNull();
  });

  it("exposes the leader during proposal phase", () => {
    expect(buildPublicGameState(room("TEAM_PROPOSAL")).currentLeaderId).toBe("p1");
  });

  it("publishes resolved proposal votes but only aggregated quest results", () => {
    const data: any = room("TEAM_PROPOSAL");
    data.proposals = [
      {
        id: "proposal-1",
        roomId: "room",
        round: 1,
        attempt: 1,
        leaderPlayerId: "p1",
        teamPlayerIds: ["p1", "p2"],
        status: "APPROVED",
        createdAt: new Date(),
        votes: [
          { id: "v1", proposalId: "proposal-1", playerId: "p1", vote: "APPROVE", createdAt: new Date() },
          { id: "v2", proposalId: "proposal-1", playerId: "p2", vote: "REJECT", createdAt: new Date() }
        ],
        quest: null
      }
    ];
    data.quests = [
      {
        id: "quest-1",
        roomId: "room",
        proposalId: "proposal-1",
        round: 1,
        teamPlayerIds: ["p1", "p2"],
        failCount: 1,
        success: false,
        createdAt: new Date()
      }
    ];

    const publicState = buildPublicGameState(data);
    expect(publicState.proposalHistory[0]).toMatchObject({
      round: 1,
      attempt: 1,
      approvePlayerIds: ["p1"],
      rejectPlayerIds: ["p2"]
    });
    expect(publicState.questHistory[0]).toEqual({
      round: 1,
      teamPlayerIds: ["p1", "p2"],
      failCount: 1,
      success: false
    });
  });
});
