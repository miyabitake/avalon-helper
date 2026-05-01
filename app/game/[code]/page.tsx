"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRoomState } from "@/components/useRoomState";
import { PlayerList } from "@/components/PlayerList";
import { ALIGNMENT_LABELS, ROLE_LABELS, STATUS_LABELS, flowHint, winnerLabel } from "@/lib/labels";
import { GameRecords } from "@/components/GameRecords";
import { HomeButton } from "@/components/HomeButton";
import { LeaveRoomButton } from "@/components/LeaveRoomButton";
import { gameOverReasonLabel } from "@/lib/labels";
import { RoleConfigPreview } from "@/components/RoleConfigPreview";
import { MAX_PROPOSAL_ATTEMPTS } from "@/game/constants";

export default function GamePage() {
  const params = useParams<{ code: string }>();
  const code = params.code.toUpperCase();
  const router = useRouter();
  const { publicState, privateView, error, act } = useRoomState(code);
  const [selected, setSelected] = useState<string[]>([]);

  const isHost = useMemo(
    () => Boolean(publicState?.players.some((player) => player.id === privateView?.playerId && player.isHost)),
    [publicState, privateView]
  );

  if (!publicState || !privateView) {
    return <main className="page"><div className="top"><div /><HomeButton /></div><div className="panel">{error || "加载中..."}</div></main>;
  }

  const currentLeader = publicState.players.find((player) => player.id === publicState.currentLeaderId) ?? null;
  const isCurrentLeader = publicState.currentLeaderId === privateView.playerId;
  const revealedEvilPlayers = publicState.assassinationRevealPlayers;
  const isCurrentQuestMember = publicState.currentTeamPlayerIds.includes(privateView.playerId);
  const rejectedAttemptsThisRound = Math.max(0, publicState.proposalAttempt - 1);
  const stageLabel =
    publicState.status === "ASSASSINATION" && publicState.assassinationMode === "MANUAL"
      ? "刺客翻牌刺杀"
      : STATUS_LABELS[publicState.status];

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function propose() {
    await act("proposal", { teamPlayerIds: selected });
    setSelected([]);
  }

  return (
    <main className="page">
      <div className="top">
        <div>
          <h1 className="title">第 {publicState.currentRound} 轮</h1>
          <div className="muted">阶段：{stageLabel} · 第 {publicState.proposalAttempt} 次提名</div>
        </div>
        <div className="top-actions">
          <button className="btn secondary" onClick={() => router.push(`/result/${code}`)}>记录</button>
          <LeaveRoomButton roomCode={code} playerId={privateView.playerId} onLeave={() => act("leave")} />
          <HomeButton />
        </div>
      </div>
      {error ? <div className="error">{error}</div> : null}

      <section className="panel stack">
        <div className="section-title">当前流程</div>
        <div className="row">
          <span>当前阶段</span>
          <b>{stageLabel}</b>
        </div>
        <div className="row">
          <span>当前队长</span>
          <b>{currentLeader?.nickname ?? "暂未确定"}</b>
        </div>
        {(publicState.status === "TEAM_PROPOSAL" || publicState.status === "TEAM_VOTING") ? (
          <div className="row">
            <span>本轮否决次数</span>
            <b>{rejectedAttemptsThisRound} / {MAX_PROPOSAL_ATTEMPTS}</b>
          </div>
        ) : null}
        <div className="muted">{flowHint(publicState.status, isCurrentLeader)}</div>
      </section>

      <section className="panel stack">
        <div className="section-title">本轮操作</div>
        {publicState.status === "TEAM_PROPOSAL" && privateView.allowedActions.includes("PROPOSE_TEAM") ? (
          <>
            {rejectedAttemptsThisRound > 0 ? (
              <div className="muted">
                上一次提名已被否决，队长已顺延至 {currentLeader?.nickname ?? "当前队长"}。本轮已否决 {rejectedAttemptsThisRound} / {MAX_PROPOSAL_ATTEMPTS} 次。
              </div>
            ) : null}
            <div className="muted">你是队长，请选择 {publicState.requiredTeamSize} 名任务成员。</div>
            <PlayerList players={publicState.players} leaderId={publicState.currentLeaderId} selectedIds={selected} onToggle={toggle} />
            <button className="btn" disabled={selected.length !== publicState.requiredTeamSize} onClick={propose}>提交提名</button>
          </>
        ) : null}

        {publicState.status === "TEAM_PROPOSAL" && !privateView.allowedActions.includes("PROPOSE_TEAM") ? (
          <div className="muted">
            {rejectedAttemptsThisRound > 0
              ? `上一次提名已被否决，队长顺延至 ${currentLeader?.nickname ?? "当前队长"}。本轮已否决 ${rejectedAttemptsThisRound} / ${MAX_PROPOSAL_ATTEMPTS} 次，等待其重新提名任务队伍。`
              : `等待队长 ${currentLeader?.nickname ?? ""} 提名任务队伍。`}
          </div>
        ) : null}

        {publicState.status === "TEAM_VOTING" ? (
          <>
            <div className="muted">队伍：{publicState.currentTeamPlayerIds.map((id) => publicState.players.find((p) => p.id === id)?.nickname).join("、")}</div>
            <div className="muted">当前为本轮第 {publicState.proposalAttempt} 次提名，若累计 5 次被否决，坏人立即获胜。</div>
            <div className="muted">已投 {publicState.voteSummary ? publicState.players.length - publicState.voteSummary.missing : 0}/{publicState.players.length}</div>
            {privateView.allowedActions.includes("VOTE_TEAM") ? (
              <div className="grid2">
                <button className="btn" onClick={() => act("vote", { proposalId: publicState.currentProposalId, vote: "APPROVE" })}>赞成</button>
                <button className="btn danger" onClick={() => act("vote", { proposalId: publicState.currentProposalId, vote: "REJECT" })}>反对</button>
              </div>
            ) : <div className="muted">你已完成投票，等待其他玩家投票。</div>}
          </>
        ) : null}

        {publicState.status === "QUEST_SUBMISSION" ? (
          <>
            <div className="muted">任务成员私下提交，系统只公开失败票数量。</div>
            {privateView.allowedActions.includes("SUBMIT_QUEST") ? (
              <div className="grid2">
                <button className="btn" onClick={() => act("quest", { questId: publicState.currentQuestId, result: "SUCCESS" })}>任务成功</button>
                <button className="btn danger" disabled={privateView.alignment !== "EVIL"} onClick={() => act("quest", { questId: publicState.currentQuestId, result: "FAIL" })}>任务失败</button>
              </div>
            ) : isCurrentQuestMember ? (
              <div className="muted">你已提交任务结果，等待其他任务成员提交。</div>
            ) : (
              <div className="muted">你不是本轮任务成员。</div>
            )}
          </>
        ) : null}

        {publicState.status === "QUEST_RESULT" ? (
          <div className="muted">本轮任务已结算，正在切换到下一轮。</div>
        ) : null}

        {publicState.status === "ASSASSINATION" ? (
          <>
            <div className="muted">
              当前流程为刺客翻牌刺杀。除奥伯伦外，坏人身份公开给全场讨论；只有刺客可以确认目标。
            </div>
            <div className="stack">
              <strong>已翻开的坏人</strong>
              {revealedEvilPlayers.length ? (
                revealedEvilPlayers.map((player) => (
                  <div className="row" key={player.playerId}>
                    <span>{player.nickname}</span>
                    <span className="pill">{ROLE_LABELS[player.role]}</span>
                  </div>
                ))
              ) : (
                <div className="muted">本局没有可公开翻开的坏人。</div>
              )}
            </div>
            {privateView.allowedActions.includes("ASSASSINATE") ? (
              <>
                <div className="muted">请选择 1 名玩家作为梅林刺杀目标。</div>
                <PlayerList players={publicState.players} selectedIds={selected.slice(0, 1)} onToggle={(id) => setSelected([id])} />
                <button className="btn danger" disabled={selected.length !== 1} onClick={() => act("assassinate", { targetPlayerId: selected[0] })}>确认刺杀</button>
              </>
            ) : (
              <div className="muted">等待刺客完成翻牌讨论并确认刺杀目标。</div>
            )}
          </>
        ) : null}

        {publicState.status === "GAME_OVER" ? (
          <>
            <strong>游戏结束：{winnerLabel(publicState.winner)}</strong>
            {publicState.assassinationResult ? (
              <div className="stack">
                <div>
                  刺客 <b>{publicState.assassinationResult.assassinNickname}</b> 刺杀了{" "}
                  <b>{publicState.assassinationResult.targetNickname}</b>
                </div>
                <div className="muted">
                  目标真实身份：{ROLE_LABELS[publicState.assassinationResult.targetRole]}
                </div>
              </div>
            ) : null}
            {publicState.gameOverReason ? <div className="muted">{gameOverReasonLabel(publicState.gameOverReason)}</div> : null}
            {isHost ? (
              <button
                className="btn"
                onClick={async () => {
                  const result = await act("restart");
                  if (result) router.push(`/room/${code}`);
                }}
              >
                新一局准备
              </button>
            ) : null}
            <button className="btn" onClick={() => router.push(`/result/${code}`)}>查看记录</button>
          </>
        ) : null}

        {publicState.status === "ROLE_ASSIGNED" || publicState.status === "ROLE_VIEWING" ? (
          privateView.allowedActions.includes("ACK_ROLE") ? (
            <>
              <div className="muted">请先查看身份并确认，确认后进入队长提名阶段。</div>
              <button className="btn" onClick={() => act("ack-role")}>我已查看身份</button>
            </>
          ) : (
            <div className="muted">你已确认身份，等待其他玩家完成查看。</div>
          )
        ) : null}
      </section>

      <section className="panel stack">
        <div className="section-title">你的身份</div>
        <div className={`identity-card ${privateView.alignment === "EVIL" ? "evil" : "good"}`}>
          <div className="identity-title">
            {privateView.role ? ROLE_LABELS[privateView.role] : "未发牌"}
          </div>
          {privateView.alignment ? (
            <div className="identity-detail">{ALIGNMENT_LABELS[privateView.alignment]}</div>
          ) : null}
          {privateView.allowedActions.includes("CALL_ASSASSINATION") ? (
            <button className="subtle-action" onClick={() => act("call-assassination")}>
              我要刺杀
            </button>
          ) : null}
        </div>
        {privateView.visiblePlayers.length ? (
          <div className="stack">
            {privateView.visiblePlayers.map((item) => (
              <div className="row" key={item.playerId}>
                <span>{item.nickname}</span>
                <span className="pill">{item.hint === "EVIL" ? "坏人" : "可能是梅林"}</span>
              </div>
            ))}
          </div>
        ) : <div className="muted">没有额外视野。</div>}
      </section>

      <section className="panel stack">
        <div className="section-title">任务比分</div>
        <div className="row"><span>好人成功</span><b>{publicState.goodQuestWins}</b></div>
        <div className="row"><span>坏人破坏</span><b>{publicState.evilQuestWins}</b></div>
      </section>

      <section className="panel stack">
        <div className="section-title">本局配置</div>
        <div className="row">
          <span>当前人数</span>
          <b>{publicState.players.length} 人局</b>
        </div>
      </section>
      <RoleConfigPreview
        playerCount={publicState.players.length}
        currentRound={publicState.currentRound}
        questHistory={publicState.questHistory}
        status={publicState.status}
      />

      {isHost && privateView.allowedActions.includes("FORCE_PROGRESS") ? (
        <button className="btn secondary" onClick={() => act("force-progress")}>房主强制推进</button>
      ) : null}
      {isHost && privateView.allowedActions.includes("ROLLBACK") ? (
        <button className="btn secondary" onClick={() => act("rollback")}>房主回退一步</button>
      ) : null}

      <GameRecords state={publicState} />
    </main>
  );
}
