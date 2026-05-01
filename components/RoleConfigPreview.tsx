"use client";

import { buildAutomaticRolePool } from "@/game/rules";
import { QUEST_TEAM_SIZES } from "@/game/constants";
import { ROLE_LABELS } from "@/lib/labels";
import type { PublicGameState, RoomStatus } from "@/types/game";

export function RoleConfigPreview({
  playerCount,
  currentRound,
  questHistory,
  status
}: {
  playerCount: number;
  currentRound?: number;
  questHistory?: PublicGameState["questHistory"];
  status?: RoomStatus;
}) {
  if (playerCount < 5 || playerCount > 10) {
    return (
      <section className="panel stack">
        <strong>身份配置</strong>
        <div className="muted">满 5 人后自动生成身份配置。</div>
      </section>
    );
  }

  const counts = buildAutomaticRolePool(playerCount).reduce<Record<string, number>>((acc, role) => {
    acc[role] = (acc[role] ?? 0) + 1;
    return acc;
  }, {});
  const questSizes = QUEST_TEAM_SIZES[playerCount as keyof typeof QUEST_TEAM_SIZES];
  const hasProtectionRound = playerCount >= 7;
  const resolvedQuestHistory = questHistory ?? [];
  const questResults = new Map(resolvedQuestHistory.map((quest) => [quest.round, quest.success]));

  return (
    <section className="panel stack">
      <strong>身份配置</strong>
      <div className="muted">根据当前人数自动生成，开局时随机发放，不可手动编辑。</div>
      <div className="config-grid">
        {Object.entries(counts).map(([role, count]) => (
          <div className="config-item" key={role}>
            <span>{ROLE_LABELS[role as keyof typeof ROLE_LABELS]}</span>
            <b>{count} 张</b>
          </div>
        ))}
      </div>
      <div className="subsection-title">任务配置</div>
      <div className="quest-track">
        {questSizes.map((size, index) => {
          const round = index + 1;
          const isProtectionRound = hasProtectionRound && round === 4;
          const questResult = questResults.get(round);
          const isResolvedSuccess = questResult === true;
          const isResolvedFail = questResult === false;
          const isCurrentRound =
            currentRound === round &&
            questResult === undefined &&
            status !== "GAME_OVER" &&
            status !== "LOBBY";
          return (
            <div className="quest-node-wrap" key={round}>
              {isProtectionRound ? <div className="quest-badge">双失败保护</div> : <div className="quest-badge ghost">普通轮</div>}
              <div
                className={[
                  "quest-node",
                  isProtectionRound ? "protection" : "",
                  isResolvedSuccess ? "resolved-success" : "",
                  isResolvedFail ? "resolved-fail" : "",
                  isCurrentRound ? "current" : ""
                ].filter(Boolean).join(" ")}
              >
                <div className="quest-node-round">任务 {round}</div>
                <div className="quest-node-size">{size}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="muted">
        {hasProtectionRound ? "第 4 轮需要 2 张失败票才会失败。" : "本局没有双失败保护轮。"}
      </div>
    </section>
  );
}
