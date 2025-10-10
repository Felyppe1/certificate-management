import {
    ExternalUserAccount,
    IExternalUserAccountsRepository,
    Provider,
} from '@/backend/application/interfaces/iexternal-user-accounts-repository'
import { prisma } from '.'

export class PrismaExternalUserAccountsRepository
    implements IExternalUserAccountsRepository
{
    async getById(userId: string, provider: Provider) {
        const account = await prisma.externalUserAccount.findUnique({
            where: {
                user_id_provider: {
                    user_id: userId,
                    provider: provider,
                },
            },
        })

        return account
            ? {
                  userId: account.user_id,
                  provider: account.provider as Provider,
                  providerUserId: account.provider_user_id,
                  accessToken: account.access_token,
                  refreshToken: account.refresh_token,
                  accessTokenExpiryDateTime:
                      account.access_token_expiry_datetime,
                  refreshTokenExpiryDateTime:
                      account.refresh_token_expiry_datetime,
              }
            : null
    }

    async save(account: ExternalUserAccount) {
        await prisma.externalUserAccount.create({
            data: {
                user_id: account.userId,
                provider: account.provider,
                provider_user_id: account.providerUserId,
                access_token: account.accessToken,
                refresh_token: account.refreshToken,
                access_token_expiry_datetime: account.accessTokenExpiryDateTime,
                refresh_token_expiry_datetime:
                    account.refreshTokenExpiryDateTime,
            },
        })
    }

    async getManyByUserId(userId: string) {
        const accounts = await prisma.externalUserAccount.findMany({
            where: {
                user_id: userId,
            },
        })

        return accounts.map(account => ({
            userId: account.user_id,
            provider: account.provider as Provider,
            providerUserId: account.provider_user_id,
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            accessTokenExpiryDateTime: account.access_token_expiry_datetime,
            refreshTokenExpiryDateTime: account.refresh_token_expiry_datetime,
        }))
    }

    async update(account: ExternalUserAccount) {
        await prisma.externalUserAccount.update({
            where: {
                user_id_provider: {
                    user_id: account.userId,
                    provider: account.provider,
                },
            },
            data: {
                provider_user_id: account.providerUserId,
                access_token: account.accessToken,
                refresh_token: account.refreshToken,
                access_token_expiry_datetime: account.accessTokenExpiryDateTime,
                refresh_token_expiry_datetime:
                    account.refreshTokenExpiryDateTime,
            },
        })
    }
}
