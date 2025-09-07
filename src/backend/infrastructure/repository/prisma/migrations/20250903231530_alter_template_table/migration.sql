/*
  Warnings:

  - The primary key for the `template_variables` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `template_variables` table. All the data in the column will be lost.
  - You are about to drop the column `google_drive_id` on the `templates` table. All the data in the column will be lost.
  - You are about to drop the column `google_drive_url` on the `templates` table. All the data in the column will be lost.
  - You are about to drop the column `storage_url` on the `templates` table. All the data in the column will be lost.
  - Added the required column `type` to the `templates` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."template_variables" DROP CONSTRAINT "template_variables_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "template_variables_pkey" PRIMARY KEY ("name", "template_id");

-- AlterTable
ALTER TABLE "public"."templates" DROP COLUMN "google_drive_id",
DROP COLUMN "google_drive_url",
DROP COLUMN "storage_url",
ADD COLUMN     "bucket_url" TEXT,
ADD COLUMN     "file_id" TEXT,
ADD COLUMN     "type" TEXT NOT NULL;
