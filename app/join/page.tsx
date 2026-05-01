"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAccount, saveAuth } from "@/lib/clientAuth";
import { HomeButton } from "@/components/HomeButton";
import { findBlockingRoom } from "@/lib/clientRooms";

export default function JoinPage() {
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit() {
    setError("");
    const cleanName = nickname.trim();
    if (!cleanName) {
      setError("请输入昵称。");
      return;
    }
    createAccount(cleanName);
    const blockingRoom = await findBlockingRoom();
    if (blockingRoom) {
      setError(`你当前仍在房间 ${blockingRoom.auth.roomCode} 中。请先回到该房间结束游戏或主动退出。`);
      return;
    }
    const roomCode = code.trim().toUpperCase();
    const response = await fetch(`/api/rooms/${roomCode}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: cleanName })
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error?.message ?? "加入失败");
      return;
    }
    saveAuth(data);
    router.push(`/room/${data.roomCode}`);
  }

  return (
    <main className="page">
      <div className="top">
        <div />
        <HomeButton />
      </div>
      <section className="panel stack">
        <h1 className="title">加入房间</h1>
        <input className="input" value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="你的昵称" />
        <input className="input" value={code} onChange={(event) => setCode(event.target.value)} placeholder="房间码" />
        {error ? <div className="error">{error}</div> : null}
        <button className="btn" onClick={submit}>加入</button>
      </section>
    </main>
  );
}
