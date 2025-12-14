-- DropForeignKey
ALTER TABLE "certificate_emissions" DROP CONSTRAINT "certificate_emissions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "certificate_generation_histories" DROP CONSTRAINT "certificate_generation_histories_certificate_emission_id_fkey";

-- DropForeignKey
ALTER TABLE "data_sources" DROP CONSTRAINT "data_sources_certificate_emission_id_fkey";

-- DropForeignKey
ALTER TABLE "email_generation_histories" DROP CONSTRAINT "email_generation_histories_email_id_fkey";

-- DropForeignKey
ALTER TABLE "emails" DROP CONSTRAINT "emails_certificate_emission_id_fkey";

-- DropForeignKey
ALTER TABLE "external_user_accounts" DROP CONSTRAINT "external_user_accounts_user_id_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "templates" DROP CONSTRAINT "templates_certificate_emission_id_fkey";

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_user_accounts" ADD CONSTRAINT "external_user_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_emissions" ADD CONSTRAINT "certificate_emissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_certificate_emission_id_fkey" FOREIGN KEY ("certificate_emission_id") REFERENCES "certificate_emissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_sources" ADD CONSTRAINT "data_sources_certificate_emission_id_fkey" FOREIGN KEY ("certificate_emission_id") REFERENCES "certificate_emissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emails" ADD CONSTRAINT "emails_certificate_emission_id_fkey" FOREIGN KEY ("certificate_emission_id") REFERENCES "certificate_emissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_generation_histories" ADD CONSTRAINT "email_generation_histories_email_id_fkey" FOREIGN KEY ("email_id") REFERENCES "emails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_generation_histories" ADD CONSTRAINT "certificate_generation_histories_certificate_emission_id_fkey" FOREIGN KEY ("certificate_emission_id") REFERENCES "certificate_emissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
