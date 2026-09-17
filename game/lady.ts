import { GameError, type Alignment } from "@/types/game";

export type LadyRecord = { round: number; inspectorId: string; targetId: string; alignment: Alignment };

export function readLadyRecords(value: unknown): LadyRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is LadyRecord => Boolean(item) && typeof item === "object" &&
    typeof item.round === "number" && typeof item.inspectorId === "string" &&
    typeof item.targetId === "string" && (item.alignment === "GOOD" || item.alignment === "EVIL"));
}

export function needsLadyInspection(round: number, holderId: string | null, goodWins: number, evilWins: number) {
  return Boolean(holderId) && [2, 3, 4].includes(round) && goodWins < 3 && evilWins < 3;
}

export function assertLadyTarget(holderId: string | null, previous: string[], actorId: string, targetId: string) {
  if (!holderId || actorId !== holderId) throw new GameError("LADY_HOLDER_ONLY", "只有湖中仙女持有者可以查验。", 403);
  if (targetId === holderId || previous.includes(targetId)) throw new GameError("INVALID_LADY_TARGET", "不能查验自己或曾经持有湖中仙女的玩家。");
}
