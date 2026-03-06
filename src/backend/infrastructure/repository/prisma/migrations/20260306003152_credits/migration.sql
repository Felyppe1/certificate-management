-- AlterTable
ALTER TABLE "data_source_columns" ALTER COLUMN "type" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "credits" INTEGER NOT NULL DEFAULT 300;

-- RenameForeignKey
ALTER TABLE "data_source_values" RENAME CONSTRAINT "data_source_values_data_source_row_id_fkey" TO "data_source_values_data_source_id_data_source_row_id_fkey";

-- AddForeignKey
ALTER TABLE "data_source_rows" ADD CONSTRAINT "data_source_rows_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "data_sources"("certificate_emission_id") ON DELETE CASCADE ON UPDATE CASCADE;
