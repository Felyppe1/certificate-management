-- CreateTable
CREATE TABLE "email_generation_histories" (
    "email_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_generation_histories_pkey" PRIMARY KEY ("email_id","created_at")
);

-- CreateTable
CREATE TABLE "certificate_generation_histories" (
    "certificate_emission_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificate_generation_histories_pkey" PRIMARY KEY ("certificate_emission_id","created_at")
);

-- AddForeignKey
ALTER TABLE "email_generation_histories" ADD CONSTRAINT "email_generation_histories_email_id_fkey" FOREIGN KEY ("email_id") REFERENCES "emails"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_generation_histories" ADD CONSTRAINT "certificate_generation_histories_certificate_emission_id_fkey" FOREIGN KEY ("certificate_emission_id") REFERENCES "certificate_emissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
