-- AlterTable
ALTER TABLE "data_sources" ADD COLUMN     "google_account_email" TEXT;

-- AlterTable
ALTER TABLE "external_user_accounts" ADD COLUMN "email" TEXT;

-- Migrate emails from users to external_user_accounts
UPDATE "external_user_accounts" ea
SET email = u.email
FROM "users" u
WHERE ea.user_id = u.id;

-- Make email NOT NULL after data migration
ALTER TABLE "external_user_accounts" ALTER COLUMN "email" SET NOT NULL;

-- AlterTable
ALTER TABLE "templates" ADD COLUMN     "google_account_email" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "verification_tokens" (
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
