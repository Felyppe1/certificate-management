/*
  Warnings:

  - A unique constraint covering the columns `[data_source_id,data_source_name]` on the table `template_variables` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `data_source_id` to the `template_variables` table without a default value. This is not possible if the table is not empty.
  - Added the required column `data_source_name` to the `template_variables` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."template_variables" ADD COLUMN     "data_source_id" TEXT NOT NULL,
ADD COLUMN     "data_source_name" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "template_variables_data_source_id_data_source_name_key" ON "public"."template_variables"("data_source_id", "data_source_name");

-- AddForeignKey
ALTER TABLE "public"."template_variables" ADD CONSTRAINT "template_variables_data_source_id_data_source_name_fkey" FOREIGN KEY ("data_source_id", "data_source_name") REFERENCES "public"."data_source_columns"("data_source_id", "name") ON DELETE RESTRICT ON UPDATE CASCADE;
