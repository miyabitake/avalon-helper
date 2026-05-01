import { Prisma, type Player, type Proposal, type Quest, type QuestSubmission, type Room, type TeamVote } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertHost } from "@/lib/auth";
import { broadcastRoomUpdate } from "@/lib/socketEvents";
import { MAX_PROPOSAL_ATTEMPTS, ROLE_ALIGNMENT } from "@/game/constants";
import {
  buildAutomaticRolePool,
  buildRolePool,
  canSubmitQuestResult,
  getQuestTeamSize,
  resolveQuestSuccess,
  shuffle
} from "@/game/rules";
import { assertActionAllowed, getRollbackTarget } from "@/game/stateMachine";
import { buildPrivateViewForRoom, buildPublicGameState } from "@/game/serializers";
import { GameError, type EnabledRoles, type PrivatePlayerView, type PublicGameState, type QuestSubmissionValue, type TeamVoteValue } from "@/types/game";

type LoadedRoom = Room & {
  players: Player[];
  proposals: (Proposal & { votes: TeamVote[]; quest: (Quest & { submissions: QuestSubmission[] }) | null })[];
  quests: Quest[];
  assassination: {
    assassinPlayerId: string;
    targetPlayerId: string;
    hitMerlin: boolean;
  } | null;
};

function roomInclude() {
  return {
    players: { orderBy: { seatIndex: "asc" as const } },
    proposals: {
      include: { votes: true, quest: { include: { submissions: true } } },
      orderBy: { createdAt: "desc" as const }
    },
    quests: { orderBy: { round: "asc" as const } },
    assassination: true
  };
}

export async function getLoadedRoom(code: string): Promise<LoadedRoom> {
  const room = await prisma.room.findUnique({ where: { code }, include: roomInclude() });
  if (!room) throw new GameError("ROOM_NOT_FOUND", "房间不存在。", 404);
  return room;
}

export async function getState(code: string, playerId: string): Promise<{
  publicState: PublicGameState;
  privateView: PrivatePlayerView;
}> {
  const room = await getLoadedRoom(code);
  return {
    publicState: buildPublicGameState(room),
    privateView: buildPrivateViewForRoom(room, playerId)
  };
}

function getCurrentLeader(room: LoadedRoom) {
  const leader = room.players[room.currentLeaderIndex];
  if (!leader) throw new GameError("LEADER_NOT_FOUND", "当前队长不存在。");
  return leader;
}

function findCurrentProposal(room: LoadedRoom) {
  return room.proposals.find(
    (proposal) => proposal.round === room.currentRound && proposal.attempt === room.proposalAttempt
  );
}

async function snapshot(room: LoadedRoom) {
  await prisma.gameStateSnapshot.create({
    data: {
      roomId: room.id,
      fromStatus: room.status,
      payload: {
        room: {
          status: room.status,
          currentRound: room.currentRound,
          proposalAttempt: room.proposalAttempt,
          currentLeaderIndex: room.currentLeaderIndex,
          goodQuestWins: room.goodQuestWins,
          evilQuestWins: room.evilQuestWins,
          winner: room.winner,
          gameOverReason: room.gameOverReason,
          assassinationMode: room.assassinationMode
        }
      } satisfies Prisma.JsonObject
    }
  });
}

function nextLeaderIndex(room: Pick<LoadedRoom, "players" | "currentLeaderIndex">) {
  return (room.currentLeaderIndex + 1) % room.players.length;
}

function uniqueTeam(teamPlayerIds: string[]) {
  return [...new Set(teamPlayerIds)];
}

function assertTeamPlayers(room: LoadedRoom, teamPlayerIds: string[]) {
  const ids = new Set(room.players.map((player) => player.id));
  if (teamPlayerIds.some((id) => !ids.has(id))) {
    throw new GameError("INVALID_TEAM_PLAYER", "提名队伍包含不存在的玩家。");
  }
}

async function assignGameSetup(room: LoadedRoom, enabledRoles?: EnabledRoles, resetExisting = false) {
  const playerCount = room.players.length;
  const resolvedEnabledRoles = enabledRoles;
  const rolePool = shuffle(resolvedEnabledRoles ? buildRolePool(playerCount, resolvedEnabledRoles) : buildAutomaticRolePool(playerCount));
  const initialLeaderIndex = Math.floor(Math.random() * playerCount);

  await prisma.$transaction(async (tx) => {
    if (resetExisting) {
      await tx.teamVote.deleteMany({ where: { proposal: { roomId: room.id } } });
      await tx.questSubmission.deleteMany({ where: { quest: { roomId: room.id } } });
      await tx.assassination.deleteMany({ where: { roomId: room.id } });
      await tx.quest.deleteMany({ where: { roomId: room.id } });
      await tx.proposal.deleteMany({ where: { roomId: room.id } });
      await tx.gameStateSnapshot.deleteMany({ where: { roomId: room.id } });
    }

    for (const [index, player] of room.players.entries()) {
      const role = rolePool[index];
      await tx.player.update({
        where: { id: player.id },
        data: {
          role,
          alignment: ROLE_ALIGNMENT[role],
          hasViewedRole: false
        }
      });
    }
    await tx.room.update({
      where: { id: room.id },
      data: {
        status: "ROLE_ASSIGNED",
        currentRound: 1,
        proposalAttempt: 1,
        currentLeaderIndex: initialLeaderIndex,
        goodQuestWins: 0,
        evilQuestWins: 0,
        winner: null,
        gameOverReason: null,
        assassinationMode: null,
        enabledRoles: resolvedEnabledRoles ? (resolvedEnabledRoles as Prisma.InputJsonValue) : Prisma.JsonNull
      }
    });
  });
}

export async function startGame(code: string, actor: Player, enabledRoles?: EnabledRoles) {
  const room = await getLoadedRoom(code);
  assertActionAllowed(room.status, "START");
  assertHost(actor);
  await assignGameSetup(room, enabledRoles, false);
  broadcastRoomUpdate(code);
}

export async function restartGame(code: string, actor: Player) {
  const room = await getLoadedRoom(code);
  assertHost(actor);
  if (room.status !== "GAME_OVER") {
    throw new GameError("GAME_NOT_OVER", "只有游戏结束后才能开启新一局。");
  }
  if (room.players.length < 5 || room.players.length > 10) {
    throw new GameError("INVALID_PLAYER_COUNT", "当前房间人数不满足重新开局条件。");
  }

  await prisma.$transaction(async (tx) => {
    await tx.teamVote.deleteMany({ where: { proposal: { roomId: room.id } } });
    await tx.questSubmission.deleteMany({ where: { quest: { roomId: room.id } } });
    await tx.assassination.deleteMany({ where: { roomId: room.id } });
    await tx.quest.deleteMany({ where: { roomId: room.id } });
    await tx.proposal.deleteMany({ where: { roomId: room.id } });
    await tx.gameStateSnapshot.deleteMany({ where: { roomId: room.id } });

    for (const player of room.players) {
      await tx.player.update({
        where: { id: player.id },
        data: {
          role: null,
          alignment: null,
          hasViewedRole: false
        }
      });
    }

    await tx.room.update({
      where: { id: room.id },
      data: {
        status: "LOBBY",
        isLocked: false,
        currentRound: 1,
        proposalAttempt: 1,
        currentLeaderIndex: 0,
        goodQuestWins: 0,
        evilQuestWins: 0,
        winner: null,
        gameOverReason: null,
        assassinationMode: null,
        enabledRoles: Prisma.JsonNull
      }
    });
  });
  broadcastRoomUpdate(code);
}

export async function callAssassination(code: string, actor: Player) {
  const room = await getLoadedRoom(code);
  assertActionAllowed(room.status, "CALL_ASSASSINATION");
  if (actor.role !== "ASSASSIN") throw new GameError("ASSASSIN_ONLY", "只有刺客可以发起刺杀。", 403);
  await snapshot(room);
  await prisma.room.update({
    where: { id: room.id },
    data: { status: "ASSASSINATION", assassinationMode: "MANUAL" }
  });
  broadcastRoomUpdate(code);
}

export async function ackRole(code: string, actor: Player) {
  const room = await getLoadedRoom(code);
  assertActionAllowed(room.status, "ACK_ROLE");
  await prisma.player.update({ where: { id: actor.id }, data: { hasViewedRole: true } });
  const updated = await getLoadedRoom(code);
  const allViewed = updated.players.every((player) => player.hasViewedRole);
  await prisma.room.update({
    where: { id: room.id },
    data: { status: allViewed ? "TEAM_PROPOSAL" : "ROLE_VIEWING" }
  });
  broadcastRoomUpdate(code);
}

export async function proposeTeam(code: string, actor: Player, teamPlayerIds: string[]) {
  const room = await getLoadedRoom(code);
  assertActionAllowed(room.status, "PROPOSE_TEAM");
  const leader = getCurrentLeader(room);
  if (actor.id !== leader.id) throw new GameError("LEADER_ONLY", "只有当前队长可以提名队伍。", 403);
  const team = uniqueTeam(teamPlayerIds);
  const requiredSize = getQuestTeamSize(room.players.length, room.currentRound);
  if (team.length !== requiredSize) throw new GameError("INVALID_TEAM_SIZE", `本轮任务需要 ${requiredSize} 人。`);
  assertTeamPlayers(room, team);

  const existing = findCurrentProposal(room);
  if (existing) {
    const sameTeam = existing.teamPlayerIds.length === team.length && existing.teamPlayerIds.every((id) => team.includes(id));
    if (!sameTeam) throw new GameError("PROPOSAL_ALREADY_EXISTS", "当前提名已存在，不能创建不同提名。");
    return existing;
  }

  await snapshot(room);
  const proposal = await prisma.proposal.create({
    data: {
      roomId: room.id,
      round: room.currentRound,
      attempt: room.proposalAttempt,
      leaderPlayerId: actor.id,
      teamPlayerIds: team
    }
  });
  await prisma.room.update({ where: { id: room.id }, data: { status: "TEAM_VOTING" } });
  broadcastRoomUpdate(code);
  return proposal;
}

async function createQuestFromApprovedProposal(room: LoadedRoom, proposal: Proposal) {
  return prisma.quest.create({
    data: {
      roomId: room.id,
      proposalId: proposal.id,
      round: room.currentRound,
      teamPlayerIds: proposal.teamPlayerIds
    }
  });
}

async function resolveProposalVotes(code: string, room: LoadedRoom, proposal: Proposal & { votes: TeamVote[] }) {
  const approveCount = proposal.votes.filter((vote) => vote.vote === "APPROVE").length;
  const rejectCount = proposal.votes.filter((vote) => vote.vote === "REJECT").length;
  const approved = approveCount > rejectCount;

  if (approved) {
    await prisma.proposal.update({ where: { id: proposal.id }, data: { status: "APPROVED" } });
    await createQuestFromApprovedProposal(room, proposal);
    await prisma.room.update({ where: { id: room.id }, data: { status: "QUEST_SUBMISSION" } });
    return;
  }

  await prisma.proposal.update({ where: { id: proposal.id }, data: { status: "REJECTED" } });
  if (room.proposalAttempt >= MAX_PROPOSAL_ATTEMPTS) {
    await prisma.room.update({ where: { id: room.id }, data: { status: "GAME_OVER", winner: "EVIL", gameOverReason: "COMPLETED" } });
    return;
  }

  await prisma.room.update({
    where: { id: room.id },
    data: {
      status: "TEAM_PROPOSAL",
      proposalAttempt: room.proposalAttempt + 1,
      currentLeaderIndex: nextLeaderIndex(room)
    }
  });
  broadcastRoomUpdate(code);
}

export async function voteTeam(code: string, actor: Player, proposalId: string, vote: TeamVoteValue) {
  const room = await getLoadedRoom(code);
  assertActionAllowed(room.status, "VOTE_TEAM");
  const proposal = findCurrentProposal(room);
  if (!proposal || proposal.id !== proposalId) throw new GameError("INVALID_PROPOSAL", "当前提名不存在。");
  if (proposal.votes.some((item) => item.playerId === actor.id)) {
    throw new GameError("DUPLICATE_VOTE", "你已经对该提名投过票。");
  }
  await prisma.teamVote.create({ data: { proposalId, playerId: actor.id, vote } });
  const updated = await getLoadedRoom(code);
  const updatedProposal = findCurrentProposal(updated);
  if (updatedProposal && updatedProposal.votes.length === updated.players.length) {
    await resolveProposalVotes(code, updated, updatedProposal);
  }
  broadcastRoomUpdate(code);
}

async function resolveQuest(code: string, room: LoadedRoom, quest: Quest) {
  const submissions = await prisma.questSubmission.findMany({ where: { questId: quest.id } });
  const failCount = submissions.filter((submission) => submission.result === "FAIL").length;
  const success = resolveQuestSuccess({ playerCount: room.players.length, round: quest.round, failCount });
  const goodQuestWins = room.goodQuestWins + (success ? 1 : 0);
  const evilQuestWins = room.evilQuestWins + (success ? 0 : 1);
  const winner = evilQuestWins >= 3 ? "EVIL" : null;
  const advancesToNextRound = evilQuestWins < 3 && goodQuestWins < 3;
  const status = evilQuestWins >= 3 ? "GAME_OVER" : goodQuestWins >= 3 ? "ASSASSINATION" : "TEAM_PROPOSAL";
  if (goodQuestWins >= 3) {
    await snapshot(room);
  }

  await prisma.$transaction([
    prisma.quest.update({ where: { id: quest.id }, data: { failCount, success } }),
    prisma.room.update({
      where: { id: room.id },
      data: {
        goodQuestWins,
        evilQuestWins,
        winner,
        status,
        gameOverReason: winner ? "COMPLETED" : room.gameOverReason,
        assassinationMode: goodQuestWins >= 3 ? "VICTORY" : room.assassinationMode,
        currentRound: advancesToNextRound ? room.currentRound + 1 : room.currentRound,
        proposalAttempt: advancesToNextRound ? 1 : room.proposalAttempt,
        currentLeaderIndex: advancesToNextRound ? nextLeaderIndex(room) : room.currentLeaderIndex
      }
    })
  ]);
  broadcastRoomUpdate(code);
}

export async function submitQuest(code: string, actor: Player, questId: string, result: QuestSubmissionValue) {
  const room = await getLoadedRoom(code);
  assertActionAllowed(room.status, "SUBMIT_QUEST");
  const proposal = findCurrentProposal(room);
  const quest = proposal?.quest;
  if (!quest || quest.id !== questId) throw new GameError("INVALID_QUEST", "当前任务不存在。");
  if (!quest.teamPlayerIds.includes(actor.id)) throw new GameError("QUEST_MEMBER_ONLY", "只有任务成员可以提交任务结果。", 403);
  if (!canSubmitQuestResult(actor, result)) throw new GameError("GOOD_CANNOT_FAIL", "好人阵营不能提交任务失败。", 403);
  const existing = await prisma.questSubmission.findUnique({ where: { questId_playerId: { questId, playerId: actor.id } } });
  if (existing) throw new GameError("DUPLICATE_QUEST_SUBMISSION", "你已经提交过任务结果。");

  await prisma.questSubmission.create({ data: { questId, playerId: actor.id, result } });
  const submissionCount = await prisma.questSubmission.count({ where: { questId } });
  if (submissionCount === quest.teamPlayerIds.length) {
    await resolveQuest(code, room, quest);
  }
  broadcastRoomUpdate(code);
}

export async function assassinate(code: string, actor: Player, targetPlayerId: string) {
  const room = await getLoadedRoom(code);
  assertActionAllowed(room.status, "ASSASSINATE");
  if (actor.role !== "ASSASSIN") throw new GameError("ASSASSIN_ONLY", "只有刺客可以执行刺杀。", 403);
  const existing = await prisma.assassination.findUnique({ where: { roomId: room.id } });
  if (existing) throw new GameError("ASSASSINATION_ALREADY_DONE", "本局已经执行过刺杀。");
  const target = room.players.find((player) => player.id === targetPlayerId);
  if (!target) throw new GameError("INVALID_TARGET", "刺杀目标不存在。");
  const hitMerlin = target.role === "MERLIN";
  await snapshot(room);
  await prisma.$transaction([
    prisma.assassination.create({
      data: { roomId: room.id, assassinPlayerId: actor.id, targetPlayerId, hitMerlin }
    }),
    prisma.room.update({
      where: { id: room.id },
      data: { status: "GAME_OVER", winner: hitMerlin ? "EVIL" : "GOOD", gameOverReason: "COMPLETED" }
    })
  ]);
  broadcastRoomUpdate(code);
}

export async function forceProgress(code: string, actor: Player) {
  let room = await getLoadedRoom(code);
  assertActionAllowed(room.status, "FORCE_PROGRESS");
  assertHost(actor);

  if (room.status === "ROLE_ASSIGNED" || room.status === "ROLE_VIEWING") {
    await prisma.room.update({ where: { id: room.id }, data: { status: "TEAM_PROPOSAL" } });
  } else if (room.status === "TEAM_VOTING") {
    const proposal = findCurrentProposal(room);
    if (!proposal) throw new GameError("INVALID_PROPOSAL", "当前提名不存在。");
    const votedIds = new Set(proposal.votes.map((vote) => vote.playerId));
    await prisma.teamVote.createMany({
      data: room.players
        .filter((player) => !votedIds.has(player.id))
        .map((player) => ({ proposalId: proposal.id, playerId: player.id, vote: "REJECT" as const })),
      skipDuplicates: true
    });
    room = await getLoadedRoom(code);
    const updatedProposal = findCurrentProposal(room);
    if (updatedProposal) await resolveProposalVotes(code, room, updatedProposal);
  } else if (room.status === "QUEST_SUBMISSION") {
    const proposal = findCurrentProposal(room);
    const quest = proposal?.quest;
    if (!quest) throw new GameError("INVALID_QUEST", "当前任务不存在。");
    const submittedIds = new Set(
      (await prisma.questSubmission.findMany({ where: { questId: quest.id } })).map((submission) => submission.playerId)
    );
    await prisma.questSubmission.createMany({
      data: quest.teamPlayerIds
        .filter((playerId) => !submittedIds.has(playerId))
        .map((playerId) => ({ questId: quest.id, playerId, result: "SUCCESS" as const })),
      skipDuplicates: true
    });
    await resolveQuest(code, room, quest);
  } else if (room.status === "QUEST_RESULT") {
    await prisma.room.update({
      where: { id: room.id },
      data: {
        status: "TEAM_PROPOSAL",
        currentRound: room.currentRound + 1,
        proposalAttempt: 1,
        currentLeaderIndex: nextLeaderIndex(room)
      }
    });
  }

  broadcastRoomUpdate(code);
}

export async function rollback(code: string, actor: Player) {
  const room = await getLoadedRoom(code);
  assertHost(actor);
  const target = getRollbackTarget(room.status);

  if (room.status === "TEAM_VOTING") {
    const proposal = findCurrentProposal(room);
    if (proposal) {
      await prisma.teamVote.deleteMany({ where: { proposalId: proposal.id } });
      await prisma.proposal.delete({ where: { id: proposal.id } });
    }
    await prisma.room.update({ where: { id: room.id }, data: { status: target } });
  } else if (room.status === "QUEST_SUBMISSION") {
    const proposal = findCurrentProposal(room);
    if (proposal?.quest) {
      await prisma.questSubmission.deleteMany({ where: { questId: proposal.quest.id } });
      await prisma.quest.delete({ where: { id: proposal.quest.id } });
    }
    if (proposal) {
      await prisma.teamVote.deleteMany({ where: { proposalId: proposal.id } });
      await prisma.proposal.delete({ where: { id: proposal.id } });
    }
    await prisma.room.update({ where: { id: room.id }, data: { status: target } });
  } else if (room.status === "ASSASSINATION") {
    await prisma.assassination.deleteMany({ where: { roomId: room.id } });
    const latestSnapshot = await prisma.gameStateSnapshot.findFirst({
      where: { roomId: room.id },
      orderBy: { createdAt: "desc" }
    });
    const snapshotRoom = latestSnapshot?.payload && typeof latestSnapshot.payload === "object"
      ? (latestSnapshot.payload as Prisma.JsonObject).room as Prisma.JsonObject | undefined
      : undefined;

    if (snapshotRoom && latestSnapshot) {
      await prisma.room.update({
        where: { id: room.id },
        data: {
          status: snapshotRoom.status as any,
          currentRound: Number(snapshotRoom.currentRound),
          proposalAttempt: Number(snapshotRoom.proposalAttempt),
          currentLeaderIndex: Number(snapshotRoom.currentLeaderIndex),
          goodQuestWins: Number(snapshotRoom.goodQuestWins),
          evilQuestWins: Number(snapshotRoom.evilQuestWins),
          winner: (snapshotRoom.winner as any) ?? null,
          gameOverReason: (snapshotRoom.gameOverReason as any) ?? null,
          assassinationMode: (snapshotRoom.assassinationMode as any) ?? null
        }
      });
      await prisma.gameStateSnapshot.delete({ where: { id: latestSnapshot.id } });
    } else {
      await prisma.room.update({ where: { id: room.id }, data: { status: target, winner: null, assassinationMode: null } });
    }
  }

  broadcastRoomUpdate(code);
}
