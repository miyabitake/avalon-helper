import { GameError, type EnabledRoles, type GamePlayer, type QuestSubmissionValue, type Role } from "@/types/game";
import {
  EVIL_SPECIAL_ROLE_ORDER,
  GOOD_SPECIAL_ROLE_ORDER,
  PLAYER_DISTRIBUTION,
  QUEST_TEAM_SIZES,
  ROLE_ALIGNMENT
} from "@/game/constants";

export function assertSupportedPlayerCount(playerCount: number): asserts playerCount is keyof typeof PLAYER_DISTRIBUTION {
  if (!(playerCount in PLAYER_DISTRIBUTION)) {
    throw new GameError("INVALID_PLAYER_COUNT", "游戏人数必须为 5 到 10 人。");
  }
}

export function requiresTwoFails(playerCount: number, round: number) {
  return playerCount >= 7 && round === 4;
}

export function resolveQuestSuccess(input: { playerCount: number; round: number; failCount: number }) {
  return requiresTwoFails(input.playerCount, input.round) ? input.failCount < 2 : input.failCount < 1;
}

export function getQuestTeamSize(playerCount: number, round: number) {
  assertSupportedPlayerCount(playerCount);
  const size = QUEST_TEAM_SIZES[playerCount][round - 1];
  if (!size) throw new GameError("INVALID_ROUND", "任务轮次必须为 1 到 5。");
  return size;
}

export function enabledRolesToRoleSet(enabledRoles: EnabledRoles): Set<Role> {
  const roles = new Set<Role>();
  if (enabledRoles.merlin) roles.add("MERLIN");
  if (enabledRoles.percival) roles.add("PERCIVAL");
  if (enabledRoles.assassin) roles.add("ASSASSIN");
  if (enabledRoles.morgana) roles.add("MORGANA");
  if (enabledRoles.oberon) roles.add("OBERON");
  if (enabledRoles.mordred) roles.add("MORDRED");
  return roles;
}

export function defaultEnabledRoles(): EnabledRoles {
  return {
    merlin: true,
    percival: true,
    assassin: true,
    morgana: true,
    oberon: false,
    mordred: false
  };
}

export function getAutomaticEnabledRoles(playerCount: number): EnabledRoles {
  assertSupportedPlayerCount(playerCount);
  const presetByPlayerCount: Record<keyof typeof PLAYER_DISTRIBUTION, EnabledRoles> = {
    5: {
      merlin: true,
      percival: true,
      assassin: true,
      morgana: true,
      oberon: false,
      mordred: false
    },
    6: {
      merlin: true,
      percival: true,
      assassin: true,
      morgana: true,
      oberon: false,
      mordred: false
    },
    7: {
      merlin: true,
      percival: true,
      assassin: true,
      morgana: true,
      oberon: true,
      mordred: false
    },
    8: {
      merlin: true,
      percival: true,
      assassin: true,
      morgana: true,
      oberon: false,
      mordred: false
    },
    9: {
      merlin: true,
      percival: true,
      assassin: true,
      morgana: true,
      oberon: false,
      mordred: true
    },
    10: {
      merlin: true,
      percival: true,
      assassin: true,
      morgana: true,
      oberon: true,
      mordred: true
    }
  };

  return presetByPlayerCount[playerCount];
}

export function buildAutomaticRolePool(playerCount: number): Role[] {
  return buildRolePool(playerCount, getAutomaticEnabledRoles(playerCount));
}

export function buildRolePool(playerCount: number, enabledRoles: EnabledRoles): Role[] {
  assertSupportedPlayerCount(playerCount);
  const distribution = PLAYER_DISTRIBUTION[playerCount];
  const enabled = enabledRolesToRoleSet(enabledRoles);
  const goodSpecials = GOOD_SPECIAL_ROLE_ORDER.filter((role) => enabled.has(role));
  const evilSpecials = EVIL_SPECIAL_ROLE_ORDER.filter((role) => enabled.has(role));

  if (goodSpecials.length > distribution.good) {
    throw new GameError("TOO_MANY_GOOD_SPECIALS", "启用的好人特殊角色超过当前人数的好人位。");
  }
  if (evilSpecials.length > distribution.evil) {
    throw new GameError("TOO_MANY_EVIL_SPECIALS", "启用的坏人特殊角色超过当前人数的坏人位。");
  }

  return [
    ...goodSpecials,
    ...Array<Role>(distribution.good - goodSpecials.length).fill("LOYAL_SERVANT"),
    ...evilSpecials,
    ...Array<Role>(distribution.evil - evilSpecials.length).fill("MINION")
  ];
}

export function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function canSubmitQuestResult(player: Pick<GamePlayer, "alignment">, result: QuestSubmissionValue) {
  return player.alignment === "EVIL" || result === "SUCCESS";
}

export function getAlignmentForRole(role: Role) {
  return ROLE_ALIGNMENT[role];
}
