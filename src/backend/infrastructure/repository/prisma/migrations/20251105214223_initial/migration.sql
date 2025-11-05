-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "public"."external_user_accounts" (
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token_expiry_datetime" TIMESTAMP(3),
    "refresh_token_expiry_datetime" TIMESTAMP(3),

    CONSTRAINT "external_user_accounts_pkey" PRIMARY KEY ("user_id","provider")
);

-- CreateTable
CREATE TABLE "public"."certificate_emissions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "certificate_emissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."templates" (
    "id" TEXT NOT NULL,
    "drive_file_id" TEXT,
    "storage_file_url" TEXT,
    "thumbnail_url" TEXT,
    "file_name" TEXT NOT NULL,
    "input_method" TEXT NOT NULL,
    "file_extension" TEXT NOT NULL,
    "certificate_emission_id" TEXT NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."template_variables" (
    "template_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data_source_id" TEXT,
    "data_source_name" TEXT,

    CONSTRAINT "template_variables_pkey" PRIMARY KEY ("name","template_id")
);

-- CreateTable
CREATE TABLE "public"."data_sources" (
    "id" TEXT NOT NULL,
    "drive_file_id" TEXT,
    "storage_file_url" TEXT,
    "thumbnail_url" TEXT,
    "file_name" TEXT NOT NULL,
    "input_method" TEXT NOT NULL,
    "file_extension" TEXT NOT NULL,
    "certificate_emission_id" TEXT NOT NULL,

    CONSTRAINT "data_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."data_source_columns" (
    "data_source_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "data_source_columns_pkey" PRIMARY KEY ("name","data_source_id")
);

-- CreateTable
CREATE TABLE "public"."data_sets" (
    "id" TEXT NOT NULL,
    "generation_status" TEXT,
    "total_bytes" INTEGER NOT NULL,
    "rows" JSONB NOT NULL,
    "data_source_id" TEXT NOT NULL,

    CONSTRAINT "data_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."outbox" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "external_user_accounts_provider_provider_user_id_key" ON "public"."external_user_accounts"("provider", "provider_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "templates_certificate_emission_id_key" ON "public"."templates"("certificate_emission_id");

-- CreateIndex
CREATE UNIQUE INDEX "template_variables_data_source_id_data_source_name_key" ON "public"."template_variables"("data_source_id", "data_source_name");

-- CreateIndex
CREATE UNIQUE INDEX "data_sources_certificate_emission_id_key" ON "public"."data_sources"("certificate_emission_id");

-- CreateIndex
CREATE UNIQUE INDEX "data_sets_data_source_id_key" ON "public"."data_sets"("data_source_id");

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."external_user_accounts" ADD CONSTRAINT "external_user_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."certificate_emissions" ADD CONSTRAINT "certificate_emissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."templates" ADD CONSTRAINT "templates_certificate_emission_id_fkey" FOREIGN KEY ("certificate_emission_id") REFERENCES "public"."certificate_emissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."template_variables" ADD CONSTRAINT "template_variables_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."template_variables" ADD CONSTRAINT "template_variables_data_source_id_data_source_name_fkey" FOREIGN KEY ("data_source_id", "data_source_name") REFERENCES "public"."data_source_columns"("data_source_id", "name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."data_sources" ADD CONSTRAINT "data_sources_certificate_emission_id_fkey" FOREIGN KEY ("certificate_emission_id") REFERENCES "public"."certificate_emissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."data_source_columns" ADD CONSTRAINT "data_source_columns_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."data_sets" ADD CONSTRAINT "data_sets_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
