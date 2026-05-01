"use client";

import { useRouter } from "next/navigation";
import { removeAuth } from "@/lib/clientAuth";

export function LeaveRoomButton({
  roomCode,
  playerId,
  onLeave
}: {
  roomCode: string;
  playerId: string | null | undefined;
  onLeave: () => Promise<unknown>;
}) {
  const router = useRouter();

  return (
    <button
      className="btn secondary"
      onClick={async () => {
        await onLeave();
        if (playerId) {
          removeAuth({ roomCode, playerId });
        }
        router.push("/");
      }}
    >
      退出房间
    </button>
  );
}
