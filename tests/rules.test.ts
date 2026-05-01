import { describe, expect, it } from "vitest";
import { PLAYER_DISTRIBUTION, QUEST_TEAM_SIZES } from "@/game/constants";
import { buildAutomaticRolePool, buildRolePool, requiresTwoFails, resolveQuestSuccess } from "@/game/rules";

describe("standard Avalon rule constants", () => {
  it("keeps player distribution exact", () => {
    expect(PLAYER_DISTRIBUTION[5]).toEqual({ good: 3, evil: 2 });
    expect(PLAYER_DISTRIBUTION[10]).toEqual({ good: 6, evil: 4 });
  });

  it("keeps quest team sizes exact", () => {
    expect(QUEST_TEAM_SIZES[5]).toEqual([2, 3, 2, 3, 3]);
    expect(QUEST_TEAM_SIZES[10]).toEqual([3, 4, 4, 5, 5]);
  });

  it("requires two fails only on round 4 with at least 7 players", () => {
    expect(requiresTwoFails(7, 4)).toBe(true);
    expect(requiresTwoFails(10, 4)).toBe(true);
    expect(requiresTwoFails(6, 4)).toBe(false);
    expect(requiresTwoFails(7, 3)).toBe(false);
  });

  it("resolves quest success using the fourth round two fail rule", () => {
    expect(resolveQuestSuccess({ playerCount: 7, round: 4, failCount: 1 })).toBe(true);
    expect(resolveQuestSuccess({ playerCount: 7, round: 4, failCount: 2 })).toBe(false);
    expect(resolveQuestSuccess({ playerCount: 6, round: 4, failCount: 1 })).toBe(false);
  });

  it("builds role pools and rejects too many evil specials", () => {
    expect(
      buildRolePool(5, {
        merlin: true,
        percival: true,
        assassin: true,
        morgana: false,
        oberon: false,
        mordred: false
      }).sort()
    ).toEqual(["ASSASSIN", "LOYAL_SERVANT", "MERLIN", "MINION", "PERCIVAL"].sort());

    expect(() =>
      buildRolePool(7, {
        merlin: true,
        percival: true,
        assassin: true,
        morgana: true,
        oberon: true,
        mordred: true
      })
    ).toThrow(/坏人特殊角色/);
  });

  it("builds automatic readonly role pools from player count", () => {
    expect(buildAutomaticRolePool(5).sort()).toEqual(
      ["MERLIN", "PERCIVAL", "LOYAL_SERVANT", "ASSASSIN", "MORGANA"].sort()
    );
    expect(buildAutomaticRolePool(6).sort()).toEqual(
      ["MERLIN", "PERCIVAL", "LOYAL_SERVANT", "LOYAL_SERVANT", "ASSASSIN", "MORGANA"].sort()
    );
    expect(buildAutomaticRolePool(7).sort()).toEqual(
      ["MERLIN", "PERCIVAL", "LOYAL_SERVANT", "LOYAL_SERVANT", "ASSASSIN", "MORGANA", "OBERON"].sort()
    );
    expect(buildAutomaticRolePool(8).sort()).toEqual(
      ["MERLIN", "PERCIVAL", "LOYAL_SERVANT", "LOYAL_SERVANT", "LOYAL_SERVANT", "ASSASSIN", "MORGANA", "MINION"].sort()
    );
    expect(buildAutomaticRolePool(9).sort()).toEqual(
      ["MERLIN", "PERCIVAL", "LOYAL_SERVANT", "LOYAL_SERVANT", "LOYAL_SERVANT", "LOYAL_SERVANT", "ASSASSIN", "MORGANA", "MORDRED"].sort()
    );
    expect(buildAutomaticRolePool(10).sort()).toEqual(
      [
        "MERLIN",
        "PERCIVAL",
        "LOYAL_SERVANT",
        "LOYAL_SERVANT",
        "LOYAL_SERVANT",
        "LOYAL_SERVANT",
        "ASSASSIN",
        "MORGANA",
        "OBERON",
        "MORDRED"
      ].sort()
    );
  });
});
