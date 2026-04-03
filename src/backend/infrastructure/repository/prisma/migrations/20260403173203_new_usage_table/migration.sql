/*
  Warnings:

  - You are about to drop the column `legacy_file_index` on the `data_source_rows` table. All the data in the column will be lost.
  - You are about to drop the `certificate_generation_histories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `email_generation_histories` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "certificate_generation_histories" DROP CONSTRAINT "certificate_generation_histories_certificate_emission_id_fkey";

-- DropForeignKey
ALTER TABLE "email_generation_histories" DROP CONSTRAINT "email_generation_histories_email_id_fkey";

-- AlterTable
ALTER TABLE "data_source_rows" DROP COLUMN "legacy_file_index";

-- DropTable
DROP TABLE "certificate_generation_histories";

-- DropTable
DROP TABLE "email_generation_histories";

-- CreateTable
CREATE TABLE "daily_usages" (
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "certificates_generated_count" INTEGER NOT NULL,
    "emails_sent_count" INTEGER NOT NULL,

    CONSTRAINT "daily_usages_pkey" PRIMARY KEY ("user_id","date")
);

-- AddForeignKey
ALTER TABLE "daily_usages" ADD CONSTRAINT "daily_usages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
