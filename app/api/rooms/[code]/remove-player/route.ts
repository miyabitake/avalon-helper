import { requirePlayer } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { removePlayer } from "@/game/roomService";
import { broadcastRoomUpdate } from "@/lib/socketEvents";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const body = await request.json();
    const { player } = await requirePlayer(code, body.playerId, body.sessionToken);
    await removePlayer(code, player, String(body.targetPlayerId ?? ""));
    broadcastRoomUpdate(code);
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}

