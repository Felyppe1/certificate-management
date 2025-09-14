/*
  Warnings:

  - You are about to drop the column `bucket_url` on the `templates` table. All the data in the column will be lost.
  - You are about to drop the column `certificate_id` on the `templates` table. All the data in the column will be lost.
  - You are about to drop the column `file_id` on the `templates` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `templates` table. All the data in the column will be lost.
  - You are about to drop the `certifications` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `file_extension` to the `templates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `input_method` to the `templates` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."certifications" DROP CONSTRAINT "certifications_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."templates" DROP CONSTRAINT "templates_certificate_id_fkey";

-- DropIndex
DROP INDEX "public"."templates_certificate_id_key";

-- AlterTable
ALTER TABLE "public"."templates" DROP COLUMN "bucket_url",
DROP COLUMN "certificate_id",
DROP COLUMN "file_id",
DROP COLUMN "type",
ADD COLUMN     "drive_file_id" TEXT,
ADD COLUMN     "file_extension" TEXT NOT NULL,
ADD COLUMN     "input_method" TEXT NOT NULL,
ADD COLUMN     "storage_file_url" TEXT;

-- DropTable
DROP TABLE "public"."certifications";

-- CreateTable
CREATE TABLE "public"."certificate_emissions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,

    CONSTRAINT "certificate_emissions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."certificate_emissions" ADD CONSTRAINT "certificate_emissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."certificate_emissions" ADD CONSTRAINT "certificate_emissions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
