/*
  Warnings:

  - Added the required column `status` to the `certificate_emissions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."certificate_emissions" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" TEXT NOT NULL;
