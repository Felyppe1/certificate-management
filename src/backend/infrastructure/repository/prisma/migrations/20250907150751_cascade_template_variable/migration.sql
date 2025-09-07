-- DropForeignKey
ALTER TABLE "public"."template_variables" DROP CONSTRAINT "template_variables_template_id_fkey";

-- AddForeignKey
ALTER TABLE "public"."template_variables" ADD CONSTRAINT "template_variables_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
