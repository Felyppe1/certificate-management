/*
  Warnings:

  - You are about to drop the `data_sets` table. If the table is not empty, all the data it contains will be lost.

*/

-- CreateEnum: COLUMN_TYPE
CREATE TYPE "public"."COLUMN_TYPE" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'ARRAY');

-- AlterTable: Add type column to data_source_columns with default value
ALTER TABLE "public"."data_source_columns" ADD COLUMN "type" "public"."COLUMN_TYPE" NOT NULL DEFAULT 'STRING';

-- AlterTable: Add array_separator column to data_source_columns
ALTER TABLE "public"."data_source_columns" ADD COLUMN "array_separator" TEXT;

-- CreateTable: data_source_rows
CREATE TABLE "public"."data_source_rows" (
    "id" TEXT NOT NULL,
    "data_source_id" TEXT NOT NULL,
    "file_bytes" INTEGER,
    "processing_status" TEXT NOT NULL,

    CONSTRAINT "data_source_rows_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "data_source_rows_id_data_source_id_key" UNIQUE ("id", "data_source_id")
);

-- CreateTable: data_source_values
CREATE TABLE "public"."data_source_values" (
    "data_source_id" TEXT NOT NULL,
    "column_name" TEXT NOT NULL,
    "data_source_row_id" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "data_source_values_pkey" PRIMARY KEY ("data_source_id","column_name","data_source_row_id")
);

-- AddForeignKey
ALTER TABLE "public"."data_source_values" ADD CONSTRAINT "data_source_values_data_source_id_column_name_fkey" FOREIGN KEY ("data_source_id", "column_name") REFERENCES "public"."data_source_columns"("data_source_id", "name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."data_source_values" ADD CONSTRAINT "data_source_values_data_source_row_id_fkey" FOREIGN KEY ("data_source_id", "data_source_row_id") REFERENCES "public"."data_source_rows"("data_source_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data Migration: Transform data_sets into normalized structure
-- For each DataSet, we'll create multiple DataSourceRows (one per row in the JSON array)
-- and populate DataSourceValues with the normalized data
DO $$
DECLARE
    dataset_record RECORD;
    row_data JSONB;
    row_id TEXT;
    column_record RECORD;
    column_key TEXT;
    column_value TEXT;
    row_count INTEGER;
    bytes_per_row INTEGER;
BEGIN
    -- Iterate through each data_set
    FOR dataset_record IN 
        SELECT 
            id,
            generation_status,
            total_bytes,
            rows,
            certificate_emission_id
        FROM "public"."data_sets"
    LOOP
        -- Check if rows is a JSON array
        IF jsonb_typeof(dataset_record.rows::jsonb) = 'array' THEN
            -- Calculate the number of rows and bytes per row
            row_count := jsonb_array_length(dataset_record.rows::jsonb);
            bytes_per_row := CASE 
                WHEN row_count > 0 THEN dataset_record.total_bytes / row_count
                ELSE NULL
            END;
            
            -- Iterate through each row in the JSON array
            FOR row_data IN 
                SELECT * FROM jsonb_array_elements(dataset_record.rows::jsonb)
            LOOP
                -- Generate a unique ID for this row
                row_id := gen_random_uuid()::TEXT;
                
                -- Insert into data_source_rows
                -- Map generation_status -> processing_status
                -- Distribute total_bytes evenly across rows
                INSERT INTO "public"."data_source_rows" (id, data_source_id, file_bytes, processing_status)
                VALUES (
                    row_id,
                    dataset_record.certificate_emission_id,
                    bytes_per_row,
                    COALESCE(dataset_record.generation_status, 'PENDING')
                );
                
                -- Get all columns for this data source
                FOR column_record IN 
                    SELECT name 
                    FROM "public"."data_source_columns" 
                    WHERE data_source_id = dataset_record.certificate_emission_id
                LOOP
                    -- Get the value for this column from the row JSON
                    IF row_data ? column_record.name THEN
                        -- Extract the value and convert to text
                        column_value := CASE 
                            WHEN jsonb_typeof(row_data->column_record.name) = 'string' THEN
                                row_data->>column_record.name
                            WHEN jsonb_typeof(row_data->column_record.name) = 'null' THEN
                                NULL
                            ELSE
                                (row_data->column_record.name)::TEXT
                        END;
                        
                        -- Insert into data_source_values
                        INSERT INTO "public"."data_source_values" 
                            (data_source_id, column_name, data_source_row_id, value)
                        VALUES (
                            dataset_record.certificate_emission_id,
                            column_record.name,
                            row_id,
                            column_value
                        );
                    END IF;
                END LOOP;
            END LOOP;
        END IF;
    END LOOP;
END $$;

-- DropTable: data_sets (after data migration is complete)
DROP TABLE "public"."data_sets";
