import type { Player, Proposal, Quest, QuestSubmission, Room, TeamVote } from "@prisma/client";
import { buildPrivatePlayerView } from "@/game/privateView";
import { getQuestTeamSize } from "@/game/rules";
import type { GamePlayer, PrivatePlayerView, PublicGameState, PublicPlayer } from "@/types/game";

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

export function toGamePlayers(players: Player[]): GamePlayer[] {
  return players.map((player) => ({
    id: player.id,
    nickname: player.nickname,
    seatIndex: player.seatIndex,
    isHost: player.isHost,
    role: player.role,
    alignment: player.alignment,
    isConnected: player.isConnected,
    hasViewedRole: player.hasViewedRole
  }));
}

export function toPublicPlayer(player: Player): PublicPlayer {
  return {
    id: player.id,
    nickname: player.nickname,
    seatIndex: player.seatIndex,
    isHost: player.isHost,
    isConnected: player.isConnected,
    hasViewedRole: player.hasViewedRole
  };
}

export function buildPublicGameState(room: LoadedRoom): PublicGameState {
  const players = [...room.players].sort((a, b) => a.seatIndex - b.seatIndex);
  const shouldShowLeader = !["LOBBY", "ROLE_ASSIGNED", "ROLE_VIEWING"].includes(room.status);
  const currentLeader = shouldShowLeader ? players[room.currentLeaderIndex] ?? null : null;
  const currentProposal = [...room.proposals]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .find((proposal) => proposal.round === room.currentRound && proposal.attempt === room.proposalAttempt);
  const currentVotes = currentProposal?.votes ?? [];
  const approve = currentVotes.filter((vote) => vote.vote === "APPROVE").length;
  const reject = currentVotes.filter((vote) => vote.vote === "REJECT").length;
  const assassination = room.assassination;
  const assassinPlayer = assassination ? players.find((player) => player.id === assassination.assassinPlayerId) ?? null : null;
  const targetPlayer = assassination ? players.find((player) => player.id === assassination.targetPlayerId) ?? null : null;
  const requiredTeamSize =
    room.status === "TEAM_PROPOSAL" || room.status === "TEAM_VOTING" || room.status === "QUEST_SUBMISSION"
      ? getQuestTeamSize(players.length, room.currentRound)
      : null;

  return {
    roomCode: room.code,
    status: room.status,
    isLocked: room.isLocked,
    players: players.map(toPublicPlayer),
    currentRound: room.currentRound,
    proposalAttempt: room.proposalAttempt,
    currentLeaderId: currentLeader?.id ?? null,
    requiredTeamSize,
    currentProposalId: currentProposal?.id ?? null,
    currentQuestId: currentProposal?.quest?.id ?? null,
    currentTeamPlayerIds: currentProposal?.teamPlayerIds ?? [],
    voteSummary: currentProposal
      ? {
          approve,
          reject,
          missing: players.length - currentVotes.length
        }
      : null,
    proposalHistory: room.proposals
      .filter((proposal) => proposal.status !== "PENDING")
      .sort((a, b) => a.round - b.round || a.attempt - b.attempt)
      .map((proposal) => ({
        proposalId: proposal.id,
        round: proposal.round,
        attempt: proposal.attempt,
        leaderPlayerId: proposal.leaderPlayerId,
        teamPlayerIds: proposal.teamPlayerIds,
        status: proposal.status,
        approvePlayerIds: proposal.votes
          .filter((vote) => vote.vote === "APPROVE")
          .map((vote) => vote.playerId),
        rejectPlayerIds: proposal.votes
          .filter((vote) => vote.vote === "REJECT")
          .map((vote) => vote.playerId)
      })),
    questHistory: room.quests
      .filter((quest) => quest.success !== null)
      .sort((a, b) => a.round - b.round)
      .map((quest) => ({
        round: quest.round,
        teamPlayerIds: quest.teamPlayerIds,
        failCount: quest.failCount ?? 0,
        success: Boolean(quest.success)
      })),
    goodQuestWins: room.goodQuestWins,
    evilQuestWins: room.evilQuestWins,
    winner: room.winner,
    gameOverReason: room.gameOverReason,
    assassinationMode: room.assassinationMode,
    assassinationRevealPlayers:
      room.status === "ASSASSINATION"
        ? players
            .filter((player) => player.alignment === "EVIL" && player.role && player.role !== "OBERON")
            .map((player) => ({
              playerId: player.id,
              nickname: player.nickname,
              role: player.role!
            }))
        : [],
    assassinationResult:
      assassination && assassinPlayer && targetPlayer && targetPlayer.role
        ? {
            assassinPlayerId: assassinPlayer.id,
            assassinNickname: assassinPlayer.nickname,
            targetPlayerId: targetPlayer.id,
            targetNickname: targetPlayer.nickname,
            targetRole: targetPlayer.role,
            hitMerlin: assassination.hitMerlin
          }
        : null
  };
}

export function buildPrivateViewForRoom(room: LoadedRoom, playerId: string): PrivatePlayerView {
  const players = [...room.players].sort((a, b) => a.seatIndex - b.seatIndex);
  const player = players.find((item) => item.id === playerId);
  const currentLeader = players[room.currentLeaderIndex] ?? null;
  const proposal = room.proposals.find(
    (item) => item.round === room.currentRound && item.attempt === room.proposalAttempt
  );
  const currentQuest = proposal?.quest;
  const allowedActions: string[] = [];

  if (player) {
    if ((room.status === "ROLE_ASSIGNED" || room.status === "ROLE_VIEWING") && !player.hasViewedRole) {
      allowedActions.push("ACK_ROLE");
    }
    if (
      ["ROLE_ASSIGNED", "ROLE_VIEWING", "TEAM_PROPOSAL", "TEAM_VOTING", "QUEST_SUBMISSION", "QUEST_RESULT"].includes(room.status) &&
      player.role === "ASSASSIN"
    ) {
      allowedActions.push("CALL_ASSASSINATION");
    }
    if (room.status === "TEAM_PROPOSAL" && currentLeader?.id === player.id) {
      allowedActions.push("PROPOSE_TEAM");
    }
    if (room.status === "TEAM_VOTING" && proposal && !proposal.votes.some((vote) => vote.playerId === player.id)) {
      allowedActions.push("VOTE_TEAM");
    }
    if (
      room.status === "QUEST_SUBMISSION" &&
      currentQuest &&
      currentQuest.teamPlayerIds.includes(player.id) &&
      !currentQuest.submissions.some((submission) => submission.playerId === player.id)
    ) {
      allowedActions.push("SUBMIT_QUEST");
    }
    if (room.status === "ASSASSINATION" && player.role === "ASSASSIN") {
      allowedActions.push("ASSASSINATE");
    }
    if (player.isHost && ["ROLE_ASSIGNED", "ROLE_VIEWING", "TEAM_VOTING", "QUEST_SUBMISSION", "QUEST_RESULT"].includes(room.status)) {
      allowedActions.push("FORCE_PROGRESS");
    }
    if (player.isHost && ["TEAM_VOTING", "QUEST_SUBMISSION", "ASSASSINATION"].includes(room.status)) {
      allowedActions.push("ROLLBACK");
    }
  }

  return buildPrivatePlayerView({
    players: toGamePlayers(players),
    playerId,
    allowedActions
  });
}
