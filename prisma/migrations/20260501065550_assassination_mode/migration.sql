-- CreateEnum
CREATE TYPE "AssassinationMode" AS ENUM ('MANUAL', 'VICTORY');

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "assassinationMode" "AssassinationMode";
