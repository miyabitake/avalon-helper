import { joinRoom } from "@/game/roomService";
import { fail, ok } from "@/lib/http";
import { broadcastRoomUpdate } from "@/lib/socketEvents";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const body = await request.json();
    const result = await joinRoom(code, String(body.nickname ?? ""));
    broadcastRoomUpdate(code);
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}

