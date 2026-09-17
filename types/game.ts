export type Alignment = "GOOD" | "EVIL";

export type Role =
  | "MERLIN"
  | "PERCIVAL"
  | "ASSASSIN"
  | "MORGANA"
  | "OBERON"
  | "MORDRED"
  | "LOYAL_SERVANT"
  | "MINION";

export type RoomStatus =
  | "LOBBY"
  | "ROLE_ASSIGNED"
  | "ROLE_VIEWING"
  | "TEAM_PROPOSAL"
  | "TEAM_VOTING"
  | "TEAM_VOTE_RESULT"
  | "QUEST_SUBMISSION"
  | "QUEST_RESULT"
  | "ASSASSINATION"
  | "GAME_OVER";

export type Winner = "GOOD" | "EVIL" | null;
export type TeamVoteValue = "APPROVE" | "REJECT";
export type QuestSubmissionValue = "SUCCESS" | "FAIL";
export type ProposalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type GameOverReason = "COMPLETED" | "PLAYER_LEFT" | null;
export type AssassinationMode = "MANUAL" | "VICTORY" | null;

export type EnabledRoles = {
  merlin: boolean;
  percival: boolean;
  assassin: boolean;
  morgana: boolean;
  oberon: boolean;
  mordred: boolean;
};

export type GamePlayer = {
  id: string;
  nickname: string;
  seatIndex: number;
  isHost: boolean;
  role: Role | null;
  alignment: Alignment | null;
  isConnected?: boolean;
  hasViewedRole?: boolean;
};

export type PublicPlayer = {
  id: string;
  nickname: string;
  seatIndex: number;
  isHost: boolean;
  isConnected: boolean;
  hasViewedRole: boolean;
};

export type VisiblePlayerHint = {
  role?: Role;
  playerId: string;
  nickname: string;
  seatIndex: number;
  hint: "EVIL" | "POSSIBLE_MERLIN";
};

export type PublicGameState = {
  roomCode: string;
  status: RoomStatus;
  isLocked: boolean;
  players: PublicPlayer[];
  currentRound: number;
  proposalAttempt: number;
  currentLeaderId: string | null;
  requiredTeamSize: number | null;
  currentProposalId: string | null;
  currentQuestId: string | null;
  currentTeamPlayerIds: string[];
  voteSummary: { approve: number; reject: number; missing: number } | null;
  proposalHistory: Array<{
    proposalId: string;
    round: number;
    attempt: number;
    leaderPlayerId: string;
    teamPlayerIds: string[];
    status: ProposalStatus;
    approvePlayerIds: string[];
    rejectPlayerIds: string[];
  }>;
  questHistory: Array<{
    round: number;
    teamPlayerIds: string[];
    failCount: number;
    success: boolean;
  }>;
  goodQuestWins: number;
  evilQuestWins: number;
  winner: Winner;
  gameOverReason: GameOverReason;
  assassinationMode: AssassinationMode;
  assassinationRevealPlayers: Array<{
    playerId: string;
    nickname: string;
    seatIndex: number;
    role: Role;
  }>;
  assassinationResult: {
    assassinPlayerId: string;
    assassinNickname: string;
    assassinSeatIndex: number;
    targetPlayerId: string;
    targetNickname: string;
    targetSeatIndex: number;
    targetRole: Role;
    hitMerlin: boolean;
  } | null;
};

export type PrivatePlayerView = {
  playerId: string;
  role: Role | null;
  alignment: Alignment | null;
  visiblePlayers: VisiblePlayerHint[];
  canAct: boolean;
  allowedActions: string[];
};

export type AuthPayload = {
  roomCode: string;
  playerId: string;
  sessionToken: string;
};

export class GameError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400
  ) {
    super(message);
  }
}
