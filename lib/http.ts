import { NextResponse } from "next/server";
import { GameError } from "@/types/game";

export function ok<T>(data: T) {
  return NextResponse.json(data);
}

export function fail(error: unknown) {
  if (error instanceof GameError) {
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "服务器内部错误。" } },
    { status: 500 }
  );
}

