/*
  Warnings:

  - A unique constraint covering the columns `[template_id]` on the table `templates` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `template_id` to the `templates` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."templates" DROP CONSTRAINT "templates_id_fkey";

-- AlterTable
ALTER TABLE "public"."templates" ADD COLUMN     "template_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "templates_template_id_key" ON "public"."templates"("template_id");

-- AddForeignKey
ALTER TABLE "public"."templates" ADD CONSTRAINT "templates_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."certifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
