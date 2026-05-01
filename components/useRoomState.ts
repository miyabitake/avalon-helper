"use client";

import { useCallback, useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { activateAuth, listAuthForRoom, loadAuthForRoom, removeAuth, type StoredAuth } from "@/lib/clientAuth";
import type { PrivatePlayerView, PublicGameState } from "@/types/game";

export function useRoomState(code: string) {
  const [publicState, setPublicState] = useState<PublicGameState | null>(null);
  const [privateView, setPrivateView] = useState<PrivatePlayerView | null>(null);
  const [error, setError] = useState("");
  const auth = typeof window === "undefined" ? null : loadAuthForRoom(code);

  async function fetchStateWithAuth(candidate: StoredAuth) {
    const params = new URLSearchParams({ playerId: candidate.playerId, sessionToken: candidate.sessionToken });
    const response = await fetch(`/api/rooms/${code}/state?${params.toString()}`, { cache: "no-store" });
    const data = await response.json();
    return { response, data };
  }

  const refresh = useCallback(async () => {
    const current = loadAuthForRoom(code);
    if (!current) {
      setPublicState(null);
      setPrivateView(null);
      setError("本机没有该房间身份，请重新加入。");
      return;
    }

    const tried = new Set<string>();
    const candidates = [current, ...listAuthForRoom(code).filter((item) => item.playerId !== current.playerId)];

    for (const candidate of candidates) {
      if (tried.has(candidate.playerId)) continue;
      tried.add(candidate.playerId);
      const { response, data } = await fetchStateWithAuth(candidate);
      if (response.ok) {
        activateAuth(candidate);
        setError("");
        setPublicState(data.publicState);
        setPrivateView(data.privateView);
        return;
      }

      if (data?.error?.code === "INVALID_SESSION") {
        removeAuth({ roomCode: candidate.roomCode, playerId: candidate.playerId });
      }

      if (candidate.playerId === current.playerId && data?.error?.code !== "INVALID_SESSION") {
        setPublicState(null);
        setPrivateView(null);
        setError(data.error?.message ?? "读取状态失败");
        return;
      }
    }

    setPublicState(null);
    setPrivateView(null);
    setError("当前房间的本机身份已失效，请重新加入或切换到仍在房间内的玩家。");
  }, [code]);

  useEffect(() => {
    refresh();
    const current = loadAuthForRoom(code);
    if (!current) return;
    const socket: Socket = io();
    socket.on("connect", () => {
      socket.emit("room:join", current);
    });
    socket.on("room:update", refresh);
    return () => {
      socket.disconnect();
    };
  }, [refresh]);

  async function act(path: string, body: Record<string, unknown> = {}) {
    const current = loadAuthForRoom(code);
    if (!current) {
      setError("缺少本机身份。");
      return null;
    }
    const response = await fetch(`/api/rooms/${code}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, playerId: current.playerId, sessionToken: current.sessionToken })
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error?.message ?? "操作失败");
      return null;
    }
    await refresh();
    return data;
  }

  return { auth, publicState, privateView, error, refresh, act };
}
