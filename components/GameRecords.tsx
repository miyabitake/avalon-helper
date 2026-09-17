import type { PublicGameState } from "@/types/game";
import { formatPlayerLabel } from "@/lib/playerLabel";

function names(ids: string[], state: PublicGameState) {
  if (!ids.length) return "无";
  return ids
    .map((id) => {
      const player = state.players.find((item) => item.id === id);
      return player ? formatPlayerLabel(player) : "未知玩家";
    })
    .join("、");
}

export function GameRecords({ state }: { state: PublicGameState }) {
  const questByRound = new Map(state.questHistory.map((quest) => [quest.round, quest]));

  return (
    <section className="panel stack">
      <strong>公开记录</strong>
      {state.proposalHistory.length ? (
        <div className="stack">
          {state.proposalHistory.map((proposal) => {
            const quest = proposal.status === "APPROVED" ? questByRound.get(proposal.round) : undefined;

            return (
              <div className="record" key={proposal.proposalId}>
                <div>
                  第 {proposal.round} 轮，第 {proposal.attempt} 次提名：
                  {proposal.status === "APPROVED" ? "通过" : "未通过"}
                </div>
                <div className="muted">队长：{names([proposal.leaderPlayerId], state)}</div>
                <div className="muted">提名队伍：{names(proposal.teamPlayerIds, state)}</div>
                <div>赞成：{names(proposal.approvePlayerIds, state)}</div>
                <div>反对：{names(proposal.rejectPlayerIds, state)}</div>

                {quest ? (
                  <div className="stack" style={{ marginTop: 12 }}>
                    <div><b>任务结果：</b>{quest.success ? "成功" : "失败"}</div>
                    <div className="muted">任务队伍：{names(quest.teamPlayerIds, state)}</div>
                    <div>失败票：{quest.failCount} 票</div>
                    {state.lady?.history.filter((record) => record.round === quest.round).map((record) => (
                      <div key={record.round}>湖中仙女：{names([record.inspectorId], state)} 查验了 {names([record.targetId], state)}</div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="muted">暂无已公开记录。</div>
      )}
    </section>
  );
}
