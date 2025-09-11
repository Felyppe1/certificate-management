/*
  Warnings:

  - Added the required column `file_name` to the `templates` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."templates" ADD COLUMN     "file_name" TEXT NOT NULL;
