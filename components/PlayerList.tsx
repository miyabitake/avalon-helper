import type { PublicPlayer } from "@/types/game";

export function PlayerList({ players, leaderId, selectedIds = [], onToggle }: {
  players: PublicPlayer[];
  leaderId?: string | null;
  selectedIds?: string[];
  onToggle?: (playerId: string) => void;
}) {
  return (
    <div className="panel">
      {players.map((player) => (
        <label className="player" key={player.id}>
          <span>
            {player.seatIndex + 1}. {player.nickname}
            {player.isHost ? <span className="pill">房主</span> : null}
            {leaderId === player.id ? <span className="pill">队长</span> : null}
          </span>
          {onToggle ? (
            <input
              type="checkbox"
              checked={selectedIds.includes(player.id)}
              onChange={() => onToggle(player.id)}
            />
          ) : (
            <span className="muted">{player.isConnected ? "在线" : "离线"}</span>
          )}
        </label>
      ))}
    </div>
  );
}

