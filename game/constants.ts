import type { Alignment, Role } from "@/types/game";

export const PLAYER_DISTRIBUTION = {
  5: { good: 3, evil: 2 },
  6: { good: 4, evil: 2 },
  7: { good: 4, evil: 3 },
  8: { good: 5, evil: 3 },
  9: { good: 6, evil: 3 },
  10: { good: 6, evil: 4 }
} as const;

export const QUEST_TEAM_SIZES = {
  5: [2, 3, 2, 3, 3],
  6: [2, 3, 4, 3, 4],
  7: [2, 3, 3, 4, 4],
  8: [3, 4, 4, 5, 5],
  9: [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5]
} as const;

export const ROLE_ALIGNMENT: Record<Role, Alignment> = {
  MERLIN: "GOOD",
  PERCIVAL: "GOOD",
  LOYAL_SERVANT: "GOOD",
  ASSASSIN: "EVIL",
  MORGANA: "EVIL",
  OBERON: "EVIL",
  MORDRED: "EVIL",
  MINION: "EVIL"
};

export const GOOD_SPECIAL_ROLE_ORDER: Role[] = ["MERLIN", "PERCIVAL"];
export const EVIL_SPECIAL_ROLE_ORDER: Role[] = ["ASSASSIN", "MORGANA", "OBERON", "MORDRED"];

export const MAX_PROPOSAL_ATTEMPTS = 5;

