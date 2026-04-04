/*
  Warnings:

  - A unique constraint covering the columns `[email_column,certificate_emission_id]` on the table `emails` will be added. If there are existing duplicate values, this will fail.
  - Made the column `email_column` on table `emails` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `expires_at` to the `sessions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "emails" ALTER COLUMN "email_column" SET NOT NULL;

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "expires_at" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "emails_email_column_certificate_emission_id_key" ON "emails"("email_column", "certificate_emission_id");

-- AddForeignKey
ALTER TABLE "emails" ADD CONSTRAINT "emails_email_column_certificate_emission_id_fkey" FOREIGN KEY ("email_column", "certificate_emission_id") REFERENCES "data_source_columns"("name", "data_source_id") ON DELETE RESTRICT ON UPDATE CASCADE;
