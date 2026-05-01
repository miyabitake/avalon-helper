import { MAX_PROPOSAL_ATTEMPTS } from "@/game/constants";
import { resolveQuestSuccess } from "@/game/rules";
import type { TeamVoteValue, Winner } from "@/types/game";

export function resolveTeamVote(votes: TeamVoteValue[]) {
  const approve = votes.filter((vote) => vote === "APPROVE").length;
  const reject = votes.filter((vote) => vote === "REJECT").length;
  return { approve, reject, approved: approve > reject };
}

export function resolveRejectedProposal(attempt: number) {
  if (attempt >= MAX_PROPOSAL_ATTEMPTS) {
    return { status: "GAME_OVER" as const, winner: "EVIL" as const, nextAttempt: attempt };
  }
  return { status: "TEAM_PROPOSAL" as const, winner: null as Winner, nextAttempt: attempt + 1 };
}

export function resolveQuestScore(input: {
  playerCount: number;
  round: number;
  failCount: number;
  goodQuestWins: number;
  evilQuestWins: number;
}) {
  const success = resolveQuestSuccess(input);
  const goodQuestWins = input.goodQuestWins + (success ? 1 : 0);
  const evilQuestWins = input.evilQuestWins + (success ? 0 : 1);
  if (evilQuestWins >= 3) return { success, goodQuestWins, evilQuestWins, status: "GAME_OVER" as const, winner: "EVIL" as const };
  if (goodQuestWins >= 3) return { success, goodQuestWins, evilQuestWins, status: "ASSASSINATION" as const, winner: null as Winner };
  return { success, goodQuestWins, evilQuestWins, status: "TEAM_PROPOSAL" as const, winner: null as Winner };
}

export function resolveAssassination(hitMerlin: boolean) {
  return hitMerlin ? "EVIL" : "GOOD";
}
