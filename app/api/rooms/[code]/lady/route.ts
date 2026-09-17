import { requirePlayer } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { inspectLady } from "@/game/gameService";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const body = await request.json();
    const { player } = await requirePlayer(code, body.playerId, body.sessionToken);
    await inspectLady(code, player, String(body.targetPlayerId ?? ""), Number(body.round));
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
