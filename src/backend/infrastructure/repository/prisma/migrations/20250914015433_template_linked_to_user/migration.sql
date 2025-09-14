/*
  Warnings:

  - You are about to drop the column `user_id` on the `certificate_emissions` table. All the data in the column will be lost.
  - Added the required column `user_id` to the `templates` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."certificate_emissions" DROP CONSTRAINT "certificate_emissions_user_id_fkey";

-- AlterTable
ALTER TABLE "public"."certificate_emissions" DROP COLUMN "user_id";

-- AlterTable
ALTER TABLE "public"."templates" ADD COLUMN     "user_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."templates" ADD CONSTRAINT "templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
