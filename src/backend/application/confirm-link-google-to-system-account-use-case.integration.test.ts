import { describe, expect, it } from 'vitest'
import { prisma } from '@/tests/setup.integration'
import { ConfirmLinkGoogleToSystemAccountUseCase } from '@/backend/application/confirm-link-google-to-system-account-use-case'
import { PrismaUsersRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-users-repository'
import { PrismaSessionsRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-sessions-repository'
import { PrismaTransactionManager } from '@/backend/interface-adapters/repository/prisma/prisma-transaction-manager'

describe('ConfirmLinkGoogleToSystemAccountUseCase (Integração)', () => {
    it('deve excluir o usuário Google, vincular conta externa ao usuário do sistema e criar sessão em transação', async () => {
        await prisma.user.create({
            data: {
                id: 'system-1',
                email: 'user@gmail.com',
                password_hash: 'hash',
                name: 'System User',
                is_email_verified: true,
            },
        })
        await prisma.user.create({
            data: {
                id: 'google-1',
                name: 'Google User',
                ExternalUserAccount: {
                    create: {
                        provider: 'GOOGLE',
                        provider_user_id: 'google-id-1',
                        email: 'user@gmail.com',
                        access_token: 'access-token',
                        refresh_token: 'refresh-token',
                        access_token_expiry_datetime: new Date(
                            Date.now() + 60 * 60 * 1000,
                        ),
                    },
                },
            },
        })

        const useCase = new ConfirmLinkGoogleToSystemAccountUseCase(
            new PrismaUsersRepository(prisma),
            new PrismaSessionsRepository(prisma),
            new PrismaTransactionManager(prisma),
        )

        await useCase.execute({ userId: 'google-1' })

        expect(
            await prisma.user.findUnique({ where: { id: 'google-1' } }),
        ).toBeNull()

        const externalAccount = await prisma.externalUserAccount.findFirst({
            where: { user_id: 'system-1', provider: 'GOOGLE' },
        })
        expect(externalAccount).not.toBeNull()

        const session = await prisma.session.findFirst({
            where: { user_id: 'system-1' },
        })
        expect(session).not.toBeNull()
    })
})
