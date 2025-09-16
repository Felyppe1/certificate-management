/*
  Warnings:

  - You are about to drop the column `template_id` on the `certificate_emissions` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `templates` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[certificate_emission_id]` on the table `templates` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `user_id` to the `certificate_emissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `certificate_emission_id` to the `templates` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."certificate_emissions" DROP CONSTRAINT "certificate_emissions_template_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."templates" DROP CONSTRAINT "templates_user_id_fkey";

-- AlterTable
ALTER TABLE "public"."certificate_emissions" DROP COLUMN "template_id",
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."templates" DROP COLUMN "user_id",
ADD COLUMN     "certificate_emission_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "templates_certificate_emission_id_key" ON "public"."templates"("certificate_emission_id");

-- AddForeignKey
ALTER TABLE "public"."certificate_emissions" ADD CONSTRAINT "certificate_emissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."templates" ADD CONSTRAINT "templates_certificate_emission_id_fkey" FOREIGN KEY ("certificate_emission_id") REFERENCES "public"."certificate_emissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
