"use client";

import { activateAuth, listAuthForRoom } from "@/lib/clientAuth";
import type { PublicPlayer } from "@/types/game";

export function AuthSwitcher({
  roomCode,
  currentPlayerId,
  players
}: {
  roomCode: string;
  currentPlayerId?: string | null;
  players: PublicPlayer[];
}) {
  const playerIds = new Set(players.map((player) => player.id));
  const identities = typeof window === "undefined" ? [] : listAuthForRoom(roomCode).filter((item) => playerIds.has(item.playerId));
  if (identities.length <= 1) return null;

  return (
    <section className="panel stack">
      <strong>本机测试身份</strong>
      <select
        className="input"
        value={currentPlayerId ?? ""}
        onChange={(event) => {
          const next = identities.find((item) => item.playerId === event.target.value);
          if (!next) return;
          activateAuth(next);
          window.location.reload();
        }}
      >
        {identities.map((identity) => {
          const player = players.find((item) => item.id === identity.playerId);
          return (
            <option key={identity.playerId} value={identity.playerId}>
              {player ? `${player.nickname}${player.isHost ? "（房主）" : ""}` : identity.playerId}
            </option>
          );
        })}
      </select>
      <div className="muted">用于本地单浏览器模拟多名玩家。真实多人请让其他设备打开局域网地址。</div>
    </section>
  );
}
