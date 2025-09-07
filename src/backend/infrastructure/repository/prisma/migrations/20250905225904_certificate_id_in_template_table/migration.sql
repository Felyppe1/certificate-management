/*
  Warnings:

  - You are about to drop the column `template_id` on the `templates` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[certificate_id]` on the table `templates` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `certificate_id` to the `templates` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."templates" DROP CONSTRAINT "templates_template_id_fkey";

-- DropIndex
DROP INDEX "public"."templates_template_id_key";

-- AlterTable
ALTER TABLE "public"."templates" DROP COLUMN "template_id",
ADD COLUMN     "certificate_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "templates_certificate_id_key" ON "public"."templates"("certificate_id");

-- AddForeignKey
ALTER TABLE "public"."templates" ADD CONSTRAINT "templates_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "public"."certifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
