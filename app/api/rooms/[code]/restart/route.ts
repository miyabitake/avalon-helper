import { requirePlayer } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { restartGame } from "@/game/gameService";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const body = await request.json();
    const { player } = await requirePlayer(code, body.playerId, body.sessionToken);
    await restartGame(code, player);
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
