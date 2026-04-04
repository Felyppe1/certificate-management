import {
    IUsersRepository,
    USER_CREDITS,
} from '@/backend/application/interfaces/repository/iusers-repository'
import { User } from '@/backend/domain/user'
import { Provider } from '@/backend/domain/external-account'
import { PrismaExecutor } from '.'
import { transactionStorage } from './prisma-transaction-manager'

export class PrismaUsersRepository implements IUsersRepository {
    constructor(private readonly defaultPrisma: PrismaExecutor) {}

    private get prisma() {
        return transactionStorage.getStore() || this.defaultPrisma
    }

    async getByEmail(email: string) {
        const user = await this.prisma.user.findUnique({
            where: {
                email,
            },
            include: { ExternalUserAccount: true },
        })

        if (!user) return null

        return new User({
            id: user.id,
            email: user.email,
            name: user.name,
            passwordHash: user.password_hash,
            credits: user.credits,
            externalAccounts: user.ExternalUserAccount.map(a => ({
                userId: a.user_id,
                provider: a.provider as Provider,
                providerUserId: a.provider_user_id,
                accessToken: a.access_token,
                refreshToken: a.refresh_token,
                accessTokenExpiryDateTime: a.access_token_expiry_datetime,
                refreshTokenExpiryDateTime: a.refresh_token_expiry_datetime,
            })),
        })
    }

    async getById(id: string) {
        const user = await this.prisma.user.findUnique({
            where: {
                id,
            },
            include: { ExternalUserAccount: true },
        })

        if (!user) return null

        return new User({
            id: user.id,
            email: user.email,
            name: user.name,
            passwordHash: user.password_hash,
            credits: user.credits,
            externalAccounts: user.ExternalUserAccount.map(a => ({
                userId: a.user_id,
                provider: a.provider as Provider,
                providerUserId: a.provider_user_id,
                accessToken: a.access_token,
                refreshToken: a.refresh_token,
                accessTokenExpiryDateTime: a.access_token_expiry_datetime,
                refreshTokenExpiryDateTime: a.refresh_token_expiry_datetime,
            })),
        })
    }

    async save(user: User) {
        const { id, name, email, credits, passwordHash, externalAccounts } =
            user.serialize()

        await this.prisma.user.create({
            data: {
                id,
                email,
                name,
                password_hash: passwordHash,
                ExternalUserAccount: {
                    create: externalAccounts.map(account => ({
                        provider: account.provider,
                        provider_user_id: account.providerUserId,
                        access_token: account.accessToken,
                        refresh_token: account.refreshToken,
                        access_token_expiry_datetime:
                            account.accessTokenExpiryDateTime,
                        refresh_token_expiry_datetime:
                            account.refreshTokenExpiryDateTime,
                    })),
                },
            },
        })
    }

    async update(user: User) {
        const { id, email, name, passwordHash, credits, externalAccounts } =
            user.serialize()
        await this.prisma.user.update({
            where: { id },
            data: {
                email,
                name,
                password_hash: passwordHash,
                ExternalUserAccount: {
                    upsert: externalAccounts.map(a => ({
                        where: {
                            user_id_provider: {
                                user_id: id,
                                provider: a.provider,
                            },
                        },
                        create: {
                            provider: a.provider,
                            provider_user_id: a.providerUserId,
                            access_token: a.accessToken,
                            refresh_token: a.refreshToken,
                            access_token_expiry_datetime:
                                a.accessTokenExpiryDateTime,
                            refresh_token_expiry_datetime:
                                a.refreshTokenExpiryDateTime,
                        },
                        update: {
                            provider_user_id: a.providerUserId,
                            access_token: a.accessToken,
                            refresh_token: a.refreshToken,
                            access_token_expiry_datetime:
                                a.accessTokenExpiryDateTime,
                            refresh_token_expiry_datetime:
                                a.refreshTokenExpiryDateTime,
                        },
                    })),
                },
            },
        })
    }

    async delete(id: string): Promise<void> {
        await this.prisma.user.delete({
            where: {
                id,
            },
        })
    }

    async deductCredits(userId: string, amount: number): Promise<boolean> {
        const result = await this.prisma.user.updateMany({
            where: { id: userId, credits: { gte: amount } },
            data: { credits: { decrement: amount } },
        })
        return result.count > 0
    }

    async resetAllDailyCredits(): Promise<void> {
        await this.prisma.user.updateMany({
            data: { credits: USER_CREDITS },
        })
    }

    async upsertDailyUsage(
        userId: string,
        increment: {
            certificatesGeneratedCount?: number
            emailsSentCount?: number
        },
    ): Promise<void> {
        const date = new Date()
        await this.prisma.dailyUsage.upsert({
            where: {
                user_id_date: { user_id: userId, date },
            },
            create: {
                user_id: userId,
                date,
                certificates_generated_count:
                    increment.certificatesGeneratedCount ?? 0,
                emails_sent_count: increment.emailsSentCount ?? 0,
            },
            update: {
                certificates_generated_count: {
                    increment: increment.certificatesGeneratedCount ?? 0,
                },
                emails_sent_count: {
                    increment: increment.emailsSentCount ?? 0,
                },
            },
        })
    }
}
