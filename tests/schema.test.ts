import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const schema = readFileSync(path.resolve(__dirname, "../prisma/schema.prisma"), "utf8");

describe("Prisma idempotency constraints", () => {
  it("prevents duplicate votes, quest submissions, assassination, and proposals", () => {
    expect(schema).toContain("@@unique([proposalId, playerId])");
    expect(schema).toContain("@@unique([questId, playerId])");
    expect(schema).toContain("roomId           String   @unique");
    expect(schema).toContain("@@unique([roomId, round, attempt])");
  });

  it("stores reconnect identity without creating duplicate players", () => {
    expect(schema).toContain("sessionToken");
    expect(schema).toContain("@@unique([roomId, sessionToken])");
    expect(schema).toContain("isConnected");
    expect(schema).toContain("lastSeenAt");
  });
});

