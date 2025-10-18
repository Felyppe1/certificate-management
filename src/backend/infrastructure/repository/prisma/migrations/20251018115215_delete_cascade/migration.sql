-- DropForeignKey
ALTER TABLE "public"."data_sets" DROP CONSTRAINT "data_sets_data_source_id_fkey";

-- AddForeignKey
ALTER TABLE "public"."data_sets" ADD CONSTRAINT "data_sets_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
