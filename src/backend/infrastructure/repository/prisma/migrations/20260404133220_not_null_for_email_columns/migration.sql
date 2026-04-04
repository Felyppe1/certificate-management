/*
  Warnings:

  - Made the column `subject` on table `emails` required. This step will fail if there are existing NULL values in that column.
  - Made the column `body` on table `emails` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "emails" ALTER COLUMN "subject" SET NOT NULL,
ALTER COLUMN "body" SET NOT NULL;
