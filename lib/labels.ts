import type { Alignment, Role, RoomStatus } from "@/types/game";
import type { GameAction } from "@/game/stateMachine";

export const ROLE_LABELS: Record<Role, string> = {
  MERLIN: "梅林",
  PERCIVAL: "派西维尔",
  ASSASSIN: "刺客",
  MORGANA: "莫甘娜",
  OBERON: "奥伯伦",
  MORDRED: "莫德雷德",
  LOYAL_SERVANT: "普通忠臣",
  MINION: "普通爪牙"
};

export const ROLE_CONFIG_LABELS = {
  merlin: "梅林",
  percival: "派西维尔",
  assassin: "刺客",
  morgana: "莫甘娜",
  oberon: "奥伯伦",
  mordred: "莫德雷德"
} as const;

export const ALIGNMENT_LABELS: Record<Alignment, string> = {
  GOOD: "好人阵营",
  EVIL: "坏人阵营"
};

export const STATUS_LABELS: Record<RoomStatus, string> = {
  LADY_INSPECTION: "湖中仙女查验",
  LOBBY: "房间准备",
  ROLE_ASSIGNED: "身份已发放",
  ROLE_VIEWING: "查看身份",
  TEAM_PROPOSAL: "队长提名",
  TEAM_VOTING: "全员投票",
  TEAM_VOTE_RESULT: "投票结果",
  QUEST_SUBMISSION: "任务提交",
  QUEST_RESULT: "任务结果",
  ASSASSINATION: "刺杀阶段",
  GAME_OVER: "游戏结束"
};

export const ACTION_LABELS: Record<GameAction, string> = {
  INSPECT_LADY: "查验阵营",
  JOIN: "加入房间",
  LOCK: "锁房",
  UNLOCK: "解锁房间",
  REMOVE_PLAYER: "移除玩家",
  START: "开始游戏",
  ACK_ROLE: "确认已查看身份",
  CALL_ASSASSINATION: "发起刺杀",
  PROPOSE_TEAM: "提交任务队伍",
  VOTE_TEAM: "队伍投票",
  SUBMIT_QUEST: "提交任务结果",
  ASSASSINATE: "刺杀",
  ROLLBACK: "回退一步",
  FORCE_PROGRESS: "强制推进"
};

export function winnerLabel(winner: "GOOD" | "EVIL" | null) {
  if (winner === "GOOD") return "好人胜利";
  if (winner === "EVIL") return "坏人胜利";
  return "尚未结束";
}

export function gameOverReasonLabel(reason: "COMPLETED" | "PLAYER_LEFT" | null) {
  if (reason === "PLAYER_LEFT") return "有玩家退出，游戏已结束";
  if (reason === "COMPLETED") return "对局正常结束";
  return "";
}

export function flowHint(status: RoomStatus, isCurrentLeader: boolean) {
  if (status === "LADY_INSPECTION") return "等待湖中仙女持有者查验阵营，完成后进入下一轮。";
  if (status === "ROLE_ASSIGNED" || status === "ROLE_VIEWING") {
    return "请每位玩家查看并确认自己的身份。";
  }
  if (status === "TEAM_PROPOSAL") {
    return isCurrentLeader ? "你是当前队长，请提名任务队伍。" : "等待当前队长提名任务队伍。";
  }
  if (status === "TEAM_VOTING") {
    return "请所有玩家对当前提名进行投票。";
  }
  if (status === "QUEST_SUBMISSION") {
    return "任务成员提交任务结果，其他玩家等待即可。";
  }
  if (status === "QUEST_RESULT") {
    return "本轮任务已结算，等待进入下一轮。";
  }
  if (status === "ASSASSINATION") {
    return "刺客翻牌刺杀中，除刺客外其他玩家不能执行流程操作。";
  }
  if (status === "GAME_OVER") {
    return "本局已结束。";
  }
  return "等待房主开始游戏。";
}
