-- AlterTable
ALTER TABLE "users" ADD COLUMN     "reset_password_code" TEXT,
ADD COLUMN     "reset_password_expires_at" TIMESTAMP(3);
