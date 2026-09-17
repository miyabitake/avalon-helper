import { describe, expect, it } from "vitest";
import { getVisiblePlayersForRole } from "@/game/privateView";
import type { GamePlayer } from "@/types/game";

const players: GamePlayer[] = [
  { id: "merlin", nickname: "Merlin", seatIndex: 0, isHost: true, role: "MERLIN", alignment: "GOOD" },
  { id: "percival", nickname: "Percival", seatIndex: 1, isHost: false, role: "PERCIVAL", alignment: "GOOD" },
  { id: "assassin", nickname: "Assassin", seatIndex: 2, isHost: false, role: "ASSASSIN", alignment: "EVIL" },
  { id: "morgana", nickname: "Morgana", seatIndex: 3, isHost: false, role: "MORGANA", alignment: "EVIL" },
  { id: "oberon", nickname: "Oberon", seatIndex: 4, isHost: false, role: "OBERON", alignment: "EVIL" },
  { id: "mordred", nickname: "Mordred", seatIndex: 5, isHost: false, role: "MORDRED", alignment: "EVIL" }
];

describe("private role visibility", () => {
  it("shares teammate roles only with non-Oberon evil players", () => {
    for (const self of players.filter((p) => p.alignment === "EVIL" && p.role !== "OBERON")) {
      const view = getVisiblePlayersForRole(self.role, players, self.id);
      expect(view.every((p) => p.playerId !== self.id && p.playerId !== "oberon")).toBe(true);
      for (const hint of view) expect(hint.role).toBe(players.find((p) => p.id === hint.playerId)?.role);
    }
    for (const self of players.filter((p) => p.alignment === "GOOD")) {
      expect(getVisiblePlayersForRole(self.role, players, self.id).every((p) => !("role" in p))).toBe(true);
    }
  });
  it("lets Merlin see evil except Mordred while still seeing Oberon", () => {
    expect(getVisiblePlayersForRole("MERLIN", players, "merlin").map((item) => item.playerId).sort()).toEqual(
      ["assassin", "morgana", "oberon"].sort()
    );
  });

  it("lets Percival see Merlin and Morgana as unordered possible Merlin targets", () => {
    expect(getVisiblePlayersForRole("PERCIVAL", players, "percival")).toEqual([
      { playerId: "merlin", nickname: "Merlin", seatIndex: 0, hint: "POSSIBLE_MERLIN" },
      { playerId: "morgana", nickname: "Morgana", seatIndex: 3, hint: "POSSIBLE_MERLIN" }
    ]);
  });

  it("hides Oberon from evil team visibility and gives Oberon no visibility", () => {
    expect(getVisiblePlayersForRole("ASSASSIN", players, "assassin").map((item) => item.playerId).sort()).toEqual(
      ["morgana", "mordred"].sort()
    );
    expect(getVisiblePlayersForRole("OBERON", players, "oberon")).toEqual([]);
  });
});
