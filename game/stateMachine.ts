import { GameError, type RoomStatus } from "@/types/game";
import { ACTION_LABELS, STATUS_LABELS } from "@/lib/labels";

export type GameAction =
  | "INSPECT_LADY"
  | "JOIN"
  | "LOCK"
  | "UNLOCK"
  | "REMOVE_PLAYER"
  | "START"
  | "ACK_ROLE"
  | "CALL_ASSASSINATION"
  | "PROPOSE_TEAM"
  | "VOTE_TEAM"
  | "SUBMIT_QUEST"
  | "ASSASSINATE"
  | "ROLLBACK"
  | "FORCE_PROGRESS";

export const STATE_ACTIONS: Record<RoomStatus, GameAction[]> = {
  LADY_INSPECTION: ["INSPECT_LADY", "CALL_ASSASSINATION"],
  LOBBY: ["JOIN", "LOCK", "UNLOCK", "REMOVE_PLAYER", "START"],
  ROLE_ASSIGNED: ["ACK_ROLE", "CALL_ASSASSINATION", "FORCE_PROGRESS"],
  ROLE_VIEWING: ["ACK_ROLE", "CALL_ASSASSINATION", "FORCE_PROGRESS"],
  TEAM_PROPOSAL: ["PROPOSE_TEAM", "CALL_ASSASSINATION"],
  TEAM_VOTING: ["VOTE_TEAM", "CALL_ASSASSINATION", "ROLLBACK", "FORCE_PROGRESS"],
  TEAM_VOTE_RESULT: ["FORCE_PROGRESS"],
  QUEST_SUBMISSION: ["SUBMIT_QUEST", "CALL_ASSASSINATION", "ROLLBACK", "FORCE_PROGRESS"],
  QUEST_RESULT: ["CALL_ASSASSINATION", "FORCE_PROGRESS"],
  ASSASSINATION: ["ASSASSINATE", "ROLLBACK"],
  GAME_OVER: []
};

export function assertActionAllowed(status: RoomStatus, action: GameAction) {
  if (status === "GAME_OVER") {
    throw new GameError("GAME_ALREADY_OVER", "游戏已经结束，不能执行流程动作。");
  }
  if (!STATE_ACTIONS[status].includes(action)) {
    throw new GameError("INVALID_STATE_ACTION", `当前阶段「${STATUS_LABELS[status]}」不允许执行「${ACTION_LABELS[action]}」。`);
  }
}

export function nextAfterQuestResult(input: {
  goodQuestWins: number;
  evilQuestWins: number;
}): RoomStatus {
  if (input.evilQuestWins >= 3) return "GAME_OVER";
  if (input.goodQuestWins >= 3) return "ASSASSINATION";
  return "TEAM_PROPOSAL";
}

export function getRollbackTarget(status: RoomStatus): RoomStatus {
  if (status === "TEAM_VOTING") return "TEAM_PROPOSAL";
  if (status === "QUEST_SUBMISSION") return "TEAM_PROPOSAL";
  if (status === "ASSASSINATION") return "QUEST_RESULT";
  throw new GameError("ROLLBACK_NOT_SUPPORTED", "当前阶段不支持回退。");
}
