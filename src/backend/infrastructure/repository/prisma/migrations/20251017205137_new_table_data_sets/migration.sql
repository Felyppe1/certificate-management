-- CreateTable
CREATE TABLE "public"."data_sets" (
    "id" TEXT NOT NULL,
    "rows" JSONB NOT NULL,
    "data_source_id" TEXT NOT NULL,

    CONSTRAINT "data_sets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "data_sets_data_source_id_key" ON "public"."data_sets"("data_source_id");

-- AddForeignKey
ALTER TABLE "public"."data_sets" ADD CONSTRAINT "data_sets_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
