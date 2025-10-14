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

-- CreateIndex
CREATE UNIQUE INDEX "data_sources_certificate_emission_id_key" ON "public"."data_sources"("certificate_emission_id");

-- AddForeignKey
ALTER TABLE "public"."data_sources" ADD CONSTRAINT "data_sources_certificate_emission_id_fkey" FOREIGN KEY ("certificate_emission_id") REFERENCES "public"."certificate_emissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."data_source_columns" ADD CONSTRAINT "data_source_columns_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
