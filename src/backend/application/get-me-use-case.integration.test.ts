import { describe, expect, it } from 'vitest'
import { prisma } from '@/tests/setup.integration'
import { GetMeUseCase } from '@/backend/application/get-me-use-case'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'

describe('GetMeUseCase (Integração)', () => {
    it('deve retornar os dados completos do perfil incluindo conta externa e troca de e-mail pendente', async () => {
        await prisma.user.create({
            data: {
                id: 'user-1',
                email: 'user@example.com',
                password_hash: 'hash',
                name: 'Test User',
                is_email_verified: true,
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
                EmailChange: {
                    create: {
                        new_email: 'new@example.com',
                        code: 'CODE123',
                        expires_at: new Date(Date.now() + 10 * 60 * 1000),
                    },
                },
            },
        })

        const useCase = new GetMeUseCase(new PrismaUsersRepository(prisma))

        const result = await useCase.execute({ userId: 'user-1' })

        expect(result.id).toBe('user-1')
        expect(result.email).toBe('user@example.com')
        expect(result.isEmailVerified).toBe(true)
        expect(result.name).toBe('Test User')
        expect(result.credits).toBe(300)
        expect(result.externalAccounts).toHaveLength(1)
        expect(result.externalAccounts[0].provider).toBe('GOOGLE')
        expect(result.emailChangeCode?.newEmail).toBe('new@example.com')
        expect(result.emailChangeCode?.expiresAt).toBeInstanceOf(Date)
    })
})