import { requirePlayer } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { submitQuest } from "@/game/gameService";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const body = await request.json();
    const { player } = await requirePlayer(code, body.playerId, body.sessionToken);
    await submitQuest(code, player, String(body.questId ?? ""), body.result);
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}

