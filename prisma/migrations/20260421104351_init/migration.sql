-- CreateEnum
CREATE TYPE "Alignment" AS ENUM ('GOOD', 'EVIL');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MERLIN', 'PERCIVAL', 'ASSASSIN', 'MORGANA', 'OBERON', 'MORDRED', 'LOYAL_SERVANT', 'MINION');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('LOBBY', 'ROLE_ASSIGNED', 'ROLE_VIEWING', 'TEAM_PROPOSAL', 'TEAM_VOTING', 'TEAM_VOTE_RESULT', 'QUEST_SUBMISSION', 'QUEST_RESULT', 'ASSASSINATION', 'GAME_OVER');

-- CreateEnum
CREATE TYPE "Winner" AS ENUM ('GOOD', 'EVIL');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TeamVoteValue" AS ENUM ('APPROVE', 'REJECT');

-- CreateEnum
CREATE TYPE "QuestSubmissionValue" AS ENUM ('SUCCESS', 'FAIL');

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'LOBBY',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "hostPlayerId" TEXT,
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "proposalAttempt" INTEGER NOT NULL DEFAULT 1,
    "currentLeaderIndex" INTEGER NOT NULL DEFAULT 0,
    "goodQuestWins" INTEGER NOT NULL DEFAULT 0,
    "evilQuestWins" INTEGER NOT NULL DEFAULT 0,
    "winner" "Winner",
    "enabledRoles" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "seatIndex" INTEGER NOT NULL,
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "role" "Role",
    "alignment" "Alignment",
    "sessionToken" TEXT NOT NULL,
    "isConnected" BOOLEAN NOT NULL DEFAULT true,
    "hasViewedRole" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "attempt" INTEGER NOT NULL,
    "leaderPlayerId" TEXT NOT NULL,
    "teamPlayerIds" TEXT[],
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamVote" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "vote" "TeamVoteValue" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quest" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "teamPlayerIds" TEXT[],
    "failCount" INTEGER,
    "success" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestSubmission" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "result" "QuestSubmissionValue" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assassination" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "assassinPlayerId" TEXT NOT NULL,
    "targetPlayerId" TEXT NOT NULL,
    "hitMerlin" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assassination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameStateSnapshot" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "fromStatus" "RoomStatus" NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameStateSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_code_key" ON "Room"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Player_roomId_seatIndex_key" ON "Player"("roomId", "seatIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Player_roomId_sessionToken_key" ON "Player"("roomId", "sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_roomId_round_attempt_key" ON "Proposal"("roomId", "round", "attempt");

-- CreateIndex
CREATE UNIQUE INDEX "TeamVote_proposalId_playerId_key" ON "TeamVote"("proposalId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Quest_proposalId_key" ON "Quest"("proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestSubmission_questId_playerId_key" ON "QuestSubmission"("questId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Assassination_roomId_key" ON "Assassination"("roomId");

-- CreateIndex
CREATE INDEX "GameStateSnapshot_roomId_fromStatus_createdAt_idx" ON "GameStateSnapshot"("roomId", "fromStatus", "createdAt");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamVote" ADD CONSTRAINT "TeamVote_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamVote" ADD CONSTRAINT "TeamVote_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestSubmission" ADD CONSTRAINT "QuestSubmission_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestSubmission" ADD CONSTRAINT "QuestSubmission_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assassination" ADD CONSTRAINT "Assassination_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameStateSnapshot" ADD CONSTRAINT "GameStateSnapshot_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
