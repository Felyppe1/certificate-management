/*
  Warnings:

  - Added the required column `generation_status` to the `data_sets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."data_sets" ADD COLUMN     "generation_status" TEXT NOT NULL;
