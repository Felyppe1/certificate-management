/*
  Warnings:

  - Added the required column `total_bytes` to the `data_sets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."data_sets" ADD COLUMN     "total_bytes" INTEGER NOT NULL;
