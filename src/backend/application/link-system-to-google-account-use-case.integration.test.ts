import { describe, expect, it } from 'vitest'
import { prisma } from '@/tests/setup.integration'
import { LinkSystemToGoogleAccountUseCase } from '@/backend/application/link-system-to-google-account-use-case'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { PrismaTransactionManager } from '@/backend/infrastructure/repository/prisma/prisma-transaction-manager'

describe('LinkSystemToGoogleAccountUseCase (Integração)', () => {
    it('deve excluir o usuário do sistema, copiar senha para a conta Google e criar sessão em transação', async () => {
        await prisma.user.create({
            data: {
                id: 'system-1',
                email: 'user@gmail.com',
                password_hash: 'hash-do-sistema',
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

        const useCase = new LinkSystemToGoogleAccountUseCase(
            new PrismaUsersRepository(prisma),
            new PrismaSessionsRepository(prisma),
            new PrismaTransactionManager(prisma),
        )

        await useCase.execute({ currentUserId: 'system-1' })

        expect(
            await prisma.user.findUnique({ where: { id: 'system-1' } }),
        ).toBeNull()

        const googleUser = await prisma.user.findUnique({
            where: { id: 'google-1' },
        })
        expect(googleUser?.password_hash).not.toBeNull()
        expect(googleUser?.email).toBe('user@gmail.com')

        const session = await prisma.session.findFirst({
            where: { user_id: 'google-1' },
        })
        expect(session).not.toBeNull()
    })
})