import type { GamePlayer, PrivatePlayerView, Role, VisiblePlayerHint } from "@/types/game";

export function getVisiblePlayersForRole(role: Role | null, players: GamePlayer[], selfPlayerId: string): VisiblePlayerHint[] {
  if (!role) return [];
  const self = players.find((player) => player.id === selfPlayerId);
  if (!self) return [];

  if (role === "MERLIN") {
    return players
      .filter((player) => player.alignment === "EVIL" && player.role !== "MORDRED")
      .map((player) => ({ playerId: player.id, nickname: player.nickname, hint: "EVIL" as const }));
  }

  if (role === "PERCIVAL") {
    return players
      .filter((player) => player.role === "MERLIN" || player.role === "MORGANA")
      .map((player) => ({ playerId: player.id, nickname: player.nickname, hint: "POSSIBLE_MERLIN" as const }));
  }

  if (role === "ASSASSIN" || role === "MORGANA" || role === "MORDRED" || role === "MINION") {
    return players
      .filter((player) => player.id !== selfPlayerId && player.alignment === "EVIL" && player.role !== "OBERON")
      .map((player) => ({ playerId: player.id, nickname: player.nickname, hint: "EVIL" as const }));
  }

  return [];
}

export function buildPrivatePlayerView(input: {
  players: GamePlayer[];
  playerId: string;
  allowedActions: string[];
}): PrivatePlayerView {
  const player = input.players.find((item) => item.id === input.playerId);
  if (!player) {
    return {
      playerId: input.playerId,
      role: null,
      alignment: null,
      visiblePlayers: [],
      canAct: false,
      allowedActions: []
    };
  }

  return {
    playerId: player.id,
    role: player.role,
    alignment: player.alignment,
    visiblePlayers: getVisiblePlayersForRole(player.role, input.players, player.id),
    canAct: input.allowedActions.length > 0,
    allowedActions: input.allowedActions
  };
}

