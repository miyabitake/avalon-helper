"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchSavedRooms } from "@/lib/clientRooms";
import { removeAuth } from "@/lib/clientAuth";
import { STATUS_LABELS, winnerLabel } from "@/lib/labels";

type SavedRoomState = Awaited<ReturnType<typeof fetchSavedRooms>>[number];

export function SavedRoomsPanel() {
  const [rooms, setRooms] = useState<SavedRoomState[]>([]);

  useEffect(() => {
    fetchSavedRooms().then(setRooms).catch(() => setRooms([]));
  }, []);

  if (!rooms.length) return null;

  return (
    <section className="panel stack">
      <strong>我的房间</strong>
      {rooms.map((room) => (
        <div className="record" key={`${room.auth.roomCode}:${room.auth.playerId}`}>
          <div>玩家：{room.auth.accountName}</div>
          <div>房间号：{room.auth.roomCode}</div>
          <div className="muted">
            {room.publicState ? `状态：${STATUS_LABELS[room.publicState.status]}` : "本地身份已失效"}
          </div>
          {room.publicState?.status === "GAME_OVER" ? (
            <div className="muted">结果：{winnerLabel(room.publicState.winner)}</div>
          ) : null}
          <div className="row">
            <Link className="btn secondary" href={`/room/${room.auth.roomCode}`}>返回房间</Link>
            <button
              className="btn secondary"
              onClick={() => {
                removeAuth(room.auth);
                window.location.reload();
              }}
            >
              清除本地记录
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
