/*
  Warnings:

  - You are about to drop the column `data_source_id` on the `data_sets` table. All the data in the column will be lost.
  - The primary key for the `data_sources` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `data_sources` table. All the data in the column will be lost.
  - The primary key for the `templates` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `templates` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[certificate_emission_id]` on the table `data_sets` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `certificate_emission_id` to the `data_sets` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."data_sets" DROP CONSTRAINT "data_sets_data_source_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."data_source_columns" DROP CONSTRAINT "data_source_columns_data_source_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."template_variables" DROP CONSTRAINT "template_variables_template_id_fkey";

-- DropIndex
DROP INDEX "public"."data_sets_data_source_id_key";

-- DropIndex
DROP INDEX "public"."data_sources_certificate_emission_id_key";

-- DropIndex
DROP INDEX "public"."templates_certificate_emission_id_key";

-- AlterTable
ALTER TABLE "public"."data_sets" DROP COLUMN "data_source_id",
ADD COLUMN     "certificate_emission_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."data_sources" DROP CONSTRAINT "data_sources_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "data_sources_pkey" PRIMARY KEY ("certificate_emission_id");

-- AlterTable
ALTER TABLE "public"."templates" DROP CONSTRAINT "templates_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "templates_pkey" PRIMARY KEY ("certificate_emission_id");

-- CreateTable
CREATE TABLE "public"."emails" (
    "id" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "email_error_type" TEXT,
    "certificate_emission_id" TEXT NOT NULL,
    "email_column" TEXT,

    CONSTRAINT "emails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "emails_certificate_emission_id_key" ON "public"."emails"("certificate_emission_id");

-- CreateIndex
CREATE UNIQUE INDEX "data_sets_certificate_emission_id_key" ON "public"."data_sets"("certificate_emission_id");

-- AddForeignKey
ALTER TABLE "public"."template_variables" ADD CONSTRAINT "template_variables_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("certificate_emission_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."data_source_columns" ADD CONSTRAINT "data_source_columns_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("certificate_emission_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."data_sets" ADD CONSTRAINT "data_sets_certificate_emission_id_fkey" FOREIGN KEY ("certificate_emission_id") REFERENCES "public"."data_sources"("certificate_emission_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."emails" ADD CONSTRAINT "emails_certificate_emission_id_fkey" FOREIGN KEY ("certificate_emission_id") REFERENCES "public"."certificate_emissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
