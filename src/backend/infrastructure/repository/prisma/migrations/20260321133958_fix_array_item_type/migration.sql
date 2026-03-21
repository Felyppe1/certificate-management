/*
  Warnings:

  - The `array_item_type` column on the `data_source_columns` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ARRAY_ITEM_TYPE" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'DATE');

-- AlterTable
ALTER TABLE "data_source_columns" DROP COLUMN "array_item_type",
ADD COLUMN     "array_item_type" "ARRAY_ITEM_TYPE";
