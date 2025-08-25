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

-- CreateIndex
CREATE UNIQUE INDEX "external_user_accounts_provider_provider_user_id_key" ON "public"."external_user_accounts"("provider", "provider_user_id");

-- AddForeignKey
ALTER TABLE "public"."external_user_accounts" ADD CONSTRAINT "external_user_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
