import { createRoom } from "@/game/roomService";
import { fail, ok } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return ok(await createRoom(String(body.nickname ?? "")));
  } catch (error) {
    return fail(error);
  }
}

