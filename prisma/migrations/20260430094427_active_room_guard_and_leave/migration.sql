-- CreateEnum
CREATE TYPE "GameOverReason" AS ENUM ('COMPLETED', 'PLAYER_LEFT');

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "gameOverReason" "GameOverReason";
