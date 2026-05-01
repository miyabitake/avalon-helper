import { reconnectRoom } from "@/game/roomService";
import { fail, ok } from "@/lib/http";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const body = await request.json();
    return ok(await reconnectRoom(code, String(body.playerId ?? ""), String(body.sessionToken ?? "")));
  } catch (error) {
    return fail(error);
  }
}

