import { describe, expect, it } from "vitest";
import { assertActionAllowed } from "@/game/stateMachine";
import { canSubmitQuestResult } from "@/game/rules";
import { resolveAssassination, resolveQuestScore, resolveRejectedProposal, resolveTeamVote } from "@/game/flowRules";

describe("state machine and flow rules", () => {
  it("rejects illegal state actions", () => {
    expect(() => assertActionAllowed("TEAM_PROPOSAL", "SUBMIT_QUEST")).toThrow(/不允许/);
    expect(() => assertActionAllowed("GAME_OVER", "VOTE_TEAM")).toThrow(/已经结束/);
  });

  it("passes team vote only when approvals are strictly greater", () => {
    expect(resolveTeamVote(["APPROVE", "APPROVE", "REJECT"]).approved).toBe(true);
    expect(resolveTeamVote(["APPROVE", "REJECT"]).approved).toBe(false);
  });

  it("gives evil victory on fifth rejected proposal", () => {
    expect(resolveRejectedProposal(4)).toEqual({ status: "TEAM_PROPOSAL", winner: null, nextAttempt: 5 });
    expect(resolveRejectedProposal(5)).toEqual({ status: "GAME_OVER", winner: "EVIL", nextAttempt: 5 });
  });

  it("moves three successful quests into assassination", () => {
    expect(resolveQuestScore({ playerCount: 5, round: 3, failCount: 0, goodQuestWins: 2, evilQuestWins: 0 })).toMatchObject({
      status: "ASSASSINATION",
      goodQuestWins: 3
    });
  });

  it("handles assassination final winner", () => {
    expect(resolveAssassination(true)).toBe("EVIL");
    expect(resolveAssassination(false)).toBe("GOOD");
  });

  it("prevents good players from submitting FAIL", () => {
    expect(canSubmitQuestResult({ alignment: "GOOD" }, "FAIL")).toBe(false);
    expect(canSubmitQuestResult({ alignment: "EVIL" }, "FAIL")).toBe(true);
  });
});

