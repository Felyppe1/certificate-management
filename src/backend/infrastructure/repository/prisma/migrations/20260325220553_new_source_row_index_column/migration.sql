/*
  Warnings:

  - Added the required column `source_row_index` to the `data_source_rows` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "data_source_rows" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "source_row_index" INTEGER NOT NULL;
