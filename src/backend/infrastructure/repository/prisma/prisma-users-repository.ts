import { EmailVerificationCode } from '@/backend/domain/email-verification-code'
import { ResetPasswordCode } from '@/backend/domain/reset-password-code'
import { EmailChangeCode } from '@/backend/domain/email-change-code'
import {
    IUsersRepository,
    USER_CREDITS,
} from '@/backend/application/interfaces/repository/iusers-repository'
import { User } from '@/backend/domain/user'
import { ExternalAccount, Provider } from '@/backend/domain/external-account'
import { isPrismaClient, PrismaExecutor, TRANSACTION_OPTIONS } from '.'
import { transactionStorage } from './prisma-transaction-manager'
import { Prisma } from './client/browser'

export class PrismaUsersRepository implements IUsersRepository {
    constructor(private readonly defaultPrisma: PrismaExecutor) {}

    private get prisma() {
        return transactionStorage.getStore() || this.defaultPrisma
    }

    private mapUser(user: {
        id: string
        email: string | null
        is_email_verified: boolean
        name: string
        password_hash: string | null
        credits: number
        ExternalUserAccount: {
            provider: string
            provider_user_id: string
            email: string
            access_token: string
            refresh_token: string | null
            access_token_expiry_datetime: Date | null
            refresh_token_expiry_datetime: Date | null
        }[]
        EmailVerificationCode?: {
            code: string
            expires_at: Date
        } | null
        EmailChange?: {
            new_email: string
            code: string
            expires_at: Date
        } | null
        reset_password_code: string | null
        reset_password_expires_at: Date | null
    }): User {
        return new User({
            id: user.id,
            email: user.email,
            isEmailVerified: user.is_email_verified,
            name: user.name,
            passwordHash: user.password_hash,
            credits: user.credits,
            externalAccounts: user.ExternalUserAccount.map(
                a =>
                    new ExternalAccount({
                        provider: a.provider as Provider,
                        providerUserId: a.provider_user_id,
                        email: a.email,
                        accessToken: a.access_token,
                        refreshToken: a.refresh_token,
                        accessTokenExpiryDateTime:
                            a.access_token_expiry_datetime,
                        refreshTokenExpiryDateTime:
                            a.refresh_token_expiry_datetime,
                    }),
            ),
            emailVerificationCode: user.EmailVerificationCode
                ? new EmailVerificationCode({
                      code: user.EmailVerificationCode.code,
                      expiresAt: user.EmailVerificationCode.expires_at,
                  })
                : null,
            resetPasswordCode:
                user.reset_password_code && user.reset_password_expires_at
                    ? new ResetPasswordCode({
                          code: user.reset_password_code,
                          expiresAt: user.reset_password_expires_at,
                      })
                    : null,
            emailChangeCode: user.EmailChange
                ? new EmailChangeCode({
                      newEmail: user.EmailChange.new_email,
                      code: user.EmailChange.code,
                      expiresAt: user.EmailChange.expires_at,
                  })
                : null,
        })
    }

    async getByEmail(email: string) {
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: {
                ExternalUserAccount: true,
                EmailVerificationCode: true,
                EmailChange: true,
            },
        })

        if (!user) return null

        return this.mapUser(user)
    }

    async getById(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: {
                ExternalUserAccount: true,
                EmailVerificationCode: true,
                EmailChange: true,
            },
        })

        if (!user) return null

        return this.mapUser(user)
    }

    async getByExternalAccount(provider: Provider, providerUserId: string) {
        const user = await this.prisma.user.findFirst({
            where: {
                ExternalUserAccount: {
                    some: { provider, provider_user_id: providerUserId },
                },
            },
            include: {
                ExternalUserAccount: true,
                EmailVerificationCode: true,
                EmailChange: true,
            },
        })

        if (!user) return null

        return this.mapUser(user)
    }

    async getByExternalAccountEmail(provider: Provider, email: string) {
        const user = await this.prisma.user.findFirst({
            where: {
                ExternalUserAccount: {
                    some: { provider, email },
                },
            },
            include: {
                ExternalUserAccount: true,
                EmailVerificationCode: true,
                EmailChange: true,
            },
        })

        if (!user) return null

        return this.mapUser(user)
    }

    async getByEmailVerificationCode(code: string) {
        const user = await this.prisma.user.findFirst({
            where: {
                EmailVerificationCode: {
                    code: code,
                },
            },
            include: {
                ExternalUserAccount: true,
                EmailVerificationCode: true,
                EmailChange: true,
            },
        })

        if (!user) return null

        return this.mapUser(user)
    }

    async getByEmailChangeCode(code: string) {
        const user = await this.prisma.user.findFirst({
            where: {
                EmailChange: { code },
            },
            include: {
                ExternalUserAccount: true,
                EmailVerificationCode: true,
                EmailChange: true,
            },
        })

        if (!user) return null

        return this.mapUser(user)
    }

    async save(user: User) {
        const {
            id,
            email,
            isEmailVerified,
            name,
            passwordHash,
            externalAccounts,
            emailVerificationCode,
        } = user.serialize()
        await this.prisma.user.create({
            data: {
                id,
                email,
                is_email_verified: isEmailVerified,
                name,
                password_hash: passwordHash,
                reset_password_code: null,
                reset_password_expires_at: null,
                ExternalUserAccount: {
                    create: externalAccounts.map(account => ({
                        provider: account.provider,
                        provider_user_id: account.providerUserId,
                        email: account.email,
                        access_token: account.accessToken,
                        refresh_token: account.refreshToken,
                        access_token_expiry_datetime:
                            account.accessTokenExpiryDateTime,
                        refresh_token_expiry_datetime:
                            account.refreshTokenExpiryDateTime,
                    })),
                },
                ...(emailVerificationCode
                    ? {
                          EmailVerificationCode: {
                              create: {
                                  code: emailVerificationCode.code,
                                  expires_at: emailVerificationCode.expiresAt,
                              },
                          },
                      }
                    : {}),
            },
        })
    }

    async update(user: User) {
        const {
            id,
            email,
            isEmailVerified,
            name,
            passwordHash,
            externalAccounts,
            emailVerificationCode,
            emailChangeCode,
            resetPasswordCode,
        } = user.serialize()

        const currentProviders = externalAccounts.map(a => a.provider)

        const execute = async (tx: Prisma.TransactionClient) => {
            if (!emailVerificationCode) {
                await tx.emailVerificationCode.deleteMany({
                    where: { user_id: id },
                })
            }

            if (!emailChangeCode) {
                await tx.emailChange.deleteMany({ where: { user_id: id } })
            }

            await tx.user.update({
                where: { id },
                data: {
                    email,
                    is_email_verified: isEmailVerified,
                    name,
                    password_hash: passwordHash,
                    reset_password_code: resetPasswordCode?.code ?? null,
                    reset_password_expires_at:
                        resetPasswordCode?.expiresAt ?? null,
                    EmailVerificationCode: emailVerificationCode
                        ? {
                              upsert: {
                                  create: {
                                      code: emailVerificationCode.code,
                                      expires_at:
                                          emailVerificationCode.expiresAt,
                                  },
                                  update: {
                                      code: emailVerificationCode.code,
                                      expires_at:
                                          emailVerificationCode.expiresAt,
                                  },
                              },
                          }
                        : undefined,
                    EmailChange: emailChangeCode
                        ? {
                              upsert: {
                                  create: {
                                      new_email: emailChangeCode.newEmail,
                                      code: emailChangeCode.code,
                                      expires_at: emailChangeCode.expiresAt,
                                  },
                                  update: {
                                      new_email: emailChangeCode.newEmail,
                                      code: emailChangeCode.code,
                                      expires_at: emailChangeCode.expiresAt,
                                  },
                              },
                          }
                        : undefined,
                    ExternalUserAccount: {
                        deleteMany: {
                            user_id: id,
                            provider: { notIn: currentProviders },
                        },
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
                                email: a.email,
                                access_token: a.accessToken,
                                refresh_token: a.refreshToken,
                                access_token_expiry_datetime:
                                    a.accessTokenExpiryDateTime,
                                refresh_token_expiry_datetime:
                                    a.refreshTokenExpiryDateTime,
                            },
                            update: {
                                provider_user_id: a.providerUserId,
                                email: a.email,
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

        if (isPrismaClient(this.prisma)) {
            await this.prisma.$transaction(execute, TRANSACTION_OPTIONS)
        } else {
            await execute(this.prisma)
        }
    }

    async delete(id: string): Promise<void> {
        await this.prisma.user.delete({ where: { id } })
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
