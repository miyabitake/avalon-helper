import { requirePlayer } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { proposeTeam } from "@/game/gameService";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const body = await request.json();
    const { player } = await requirePlayer(code, body.playerId, body.sessionToken);
    const proposal = await proposeTeam(code, player, Array.isArray(body.teamPlayerIds) ? body.teamPlayerIds : []);
    return ok({ ok: true, proposalId: proposal.id });
  } catch (error) {
    return fail(error);
  }
}

