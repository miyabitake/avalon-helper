"use client";

import { useParams, useRouter } from "next/navigation";
import { useRoomState } from "@/components/useRoomState";
import { PlayerList } from "@/components/PlayerList";
import { HomeButton } from "@/components/HomeButton";
import { RoleConfigPreview } from "@/components/RoleConfigPreview";
import { LeaveRoomButton } from "@/components/LeaveRoomButton";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = params.code.toUpperCase();
  const router = useRouter();
  const { publicState, privateView, error, act } = useRoomState(code);

  if (!publicState) {
    return <main className="page"><div className="top"><div /><HomeButton /></div><div className="panel">{error || "加载中..."}</div></main>;
  }

  const playerCount = publicState.players.length;
  const isHost = publicState.players.some((player) => player.id === privateView?.playerId && player.isHost);

  async function start() {
    const result = await act("start");
    if (result) router.push(`/game/${code}`);
  }

  async function restart() {
    const result = await act("restart");
    if (result) router.push(`/room/${code}`);
  }

  return (
    <main className="page">
      <div className="top">
        <div>
          <h1 className="title">房间 {code}</h1>
          <div className="muted">{playerCount}/10 人</div>
        </div>
        <div className="top-actions">
          <button className="btn secondary" onClick={() => router.push(`/game/${code}`)}>进游戏页</button>
          <LeaveRoomButton roomCode={code} playerId={privateView?.playerId} onLeave={() => act("leave")} />
          <HomeButton />
        </div>
      </div>
      {error ? <div className="error">{error}</div> : null}
      <PlayerList players={publicState.players} leaderId={publicState.currentLeaderId} />
      {isHost ? (
        <section className="panel stack">
          <div className="row">
            <div className="section-title">房间管理</div>
            <button className="btn secondary" onClick={() => act("lock", { isLocked: !publicState.isLocked })}>
              {publicState.isLocked ? "解锁" : "锁房"}
            </button>
          </div>
          {publicState.players.filter((player) => player.id !== privateView?.playerId).map((player) => (
            <div className="row" key={player.id}>
              <span>{player.nickname}</span>
              <button className="btn secondary" onClick={() => act("remove-player", { targetPlayerId: player.id })}>移除</button>
            </div>
          ))}
          {publicState.status === "GAME_OVER" ? (
            <>
              <div className="muted">点击后回到新一局准备阶段，可先增减玩家，再重新开始。</div>
              <button className="btn" disabled={playerCount < 5} onClick={restart}>新一局准备</button>
            </>
          ) : (
            <button className="btn" disabled={playerCount < 5 || publicState.status !== "LOBBY"} onClick={start}>开始游戏</button>
          )}
        </section>
      ) : (
        <section className="panel muted">等待房主开始游戏。</section>
      )}
      <RoleConfigPreview playerCount={playerCount} />
    </main>
  );
}
