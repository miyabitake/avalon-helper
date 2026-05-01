"use client";

import { useParams, useRouter } from "next/navigation";
import { useRoomState } from "@/components/useRoomState";
import { gameOverReasonLabel, ROLE_LABELS, winnerLabel } from "@/lib/labels";
import { GameRecords } from "@/components/GameRecords";
import { HomeButton } from "@/components/HomeButton";
import { LeaveRoomButton } from "@/components/LeaveRoomButton";

export default function ResultPage() {
  const params = useParams<{ code: string }>();
  const code = params.code.toUpperCase();
  const router = useRouter();
  const { publicState, privateView, error, act } = useRoomState(code);

  if (!publicState) {
    return <main className="page"><div className="top"><div /><HomeButton /></div><div className="panel">{error || "加载中..."}</div></main>;
  }

  const isHost = publicState.players.some((player) => player.id === privateView?.playerId && player.isHost);

  return (
    <main className="page">
      <div className="top">
        <div>
          <h1 className="title">对局记录</h1>
          <div className="muted">房间 {code}</div>
        </div>
        <div className="top-actions">
          <button className="btn secondary" onClick={() => router.push(`/game/${code}`)}>返回</button>
          <LeaveRoomButton roomCode={code} playerId={privateView?.playerId} onLeave={() => act("leave")} />
          <HomeButton />
        </div>
      </div>
      <section className="panel stack">
        <div className="section-title">结果</div>
        <div>{winnerLabel(publicState.winner)}</div>
        {publicState.assassinationResult ? (
          <>
            <div>
              刺客 <b>{publicState.assassinationResult.assassinNickname}</b> 刺杀了{" "}
              <b>{publicState.assassinationResult.targetNickname}</b>
            </div>
            <div className="muted">
              目标真实身份：{ROLE_LABELS[publicState.assassinationResult.targetRole]}
            </div>
          </>
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
      </section>
      <GameRecords state={publicState} />
    </main>
  );
}
