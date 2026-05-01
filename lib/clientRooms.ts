"use client";

import { listAllAuth, loadActiveAccount } from "@/lib/clientAuth";
import type { AuthPayload, PublicGameState } from "@/types/game";
import type { StoredAuth } from "@/lib/clientAuth";

export type SavedRoomState = {
  auth: StoredAuth;
  publicState: PublicGameState | null;
  valid: boolean;
};

export async function fetchSavedRooms(): Promise<SavedRoomState[]> {
  const deduped = new Map<string, StoredAuth>();
  for (const auth of listAllAuth()) {
    const key = `${auth.roomCode}:${auth.playerId}`;
    deduped.set(key, auth);
  }

  const results = await Promise.all(
    [...deduped.values()].map(async (auth) => {
      const params = new URLSearchParams({ playerId: auth.playerId, sessionToken: auth.sessionToken });
      const response = await fetch(`/api/rooms/${auth.roomCode}/state?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) {
        return { auth, publicState: null, valid: false };
      }
      const data = await response.json();
      return { auth, publicState: data.publicState as PublicGameState, valid: true };
    })
  );

  return results;
}

export async function findBlockingRoom() {
  const activeAccount = loadActiveAccount();
  if (!activeAccount) return null;
  const rooms = await fetchSavedRooms();
  return rooms.find(
    (room) =>
      room.auth.accountId === activeAccount.id &&
      room.valid &&
      room.publicState &&
      room.publicState.status !== "GAME_OVER"
  ) ?? null;
}
