import { requirePlayer } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { getState } from "@/game/gameService";

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const url = new URL(request.url);
    const playerId = url.searchParams.get("playerId");
    const sessionToken = url.searchParams.get("sessionToken");
    const { player } = await requirePlayer(code, playerId, sessionToken);
    return ok(await getState(code, player.id));
  } catch (error) {
    return fail(error);
  }
}

