-- DropForeignKey
ALTER TABLE "public"."template_variables" DROP CONSTRAINT "template_variables_data_source_id_data_source_name_fkey";

-- AlterTable
ALTER TABLE "public"."template_variables" ALTER COLUMN "data_source_id" DROP NOT NULL,
ALTER COLUMN "data_source_name" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."template_variables" ADD CONSTRAINT "template_variables_data_source_id_data_source_name_fkey" FOREIGN KEY ("data_source_id", "data_source_name") REFERENCES "public"."data_source_columns"("data_source_id", "name") ON DELETE SET NULL ON UPDATE CASCADE;
