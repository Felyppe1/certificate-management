/*
  Warnings:

  - You are about to drop the column `drive_file_id` on the `data_sources` table. All the data in the column will be lost.
  - You are about to drop the column `file_name` on the `data_sources` table. All the data in the column will be lost.
  - You are about to drop the column `storage_file_url` on the `data_sources` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "data_sources" DROP COLUMN "drive_file_id",
DROP COLUMN "file_name",
DROP COLUMN "storage_file_url";

-- CreateTable
CREATE TABLE "data_source_files" (
    "data_source_id" TEXT NOT NULL,
    "file_index" INTEGER NOT NULL,
    "file_name" TEXT NOT NULL,
    "drive_file_id" TEXT,
    "storage_file_url" TEXT,

    CONSTRAINT "data_source_files_pkey" PRIMARY KEY ("data_source_id","file_index")
);

-- AddForeignKey
ALTER TABLE "data_source_files" ADD CONSTRAINT "data_source_files_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "data_sources"("certificate_emission_id") ON DELETE CASCADE ON UPDATE CASCADE;
