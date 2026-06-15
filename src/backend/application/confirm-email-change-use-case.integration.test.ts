import { describe, expect, it } from 'vitest'
import { prisma } from '@/tests/setup.integration'
import { ConfirmEmailChangeUseCase } from '@/backend/application/confirm-email-change-use-case'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { EmailUnavailableError } from '@/backend/domain/error/conflict-error/email-unavailable-error'

describe('ConfirmEmailChangeUseCase (Integração)', () => {
    it('deve atualizar o e-mail do usuário e remover a solicitação de troca do banco', async () => {
        await prisma.user.create({
            data: {
                id: 'user-1',
                email: 'original@example.com',
                password_hash: 'hash',
                name: 'Test User',
                EmailChange: {
                    create: {
                        new_email: 'new@example.com',
                        code: 'CODE123',
                        expires_at: new Date(Date.now() + 10 * 60 * 1000),
                    },
                },
            },
        })

        const useCase = new ConfirmEmailChangeUseCase(
            new PrismaUsersRepository(prisma),
        )

        await useCase.execute({ userId: 'user-1', code: 'CODE123' })

        const user = await prisma.user.findUnique({ where: { id: 'user-1' } })
        expect(user?.email).toBe('new@example.com')

        const emailChange = await prisma.emailChange.findUnique({
            where: { user_id: 'user-1' },
        })
        expect(emailChange).toBeNull()
    })

    it('deve impedir confirmação quando o novo e-mail já pertence a outro usuário no momento da confirmação', async () => {
        await prisma.user.create({
            data: {
                id: 'user-1',
                email: 'original@example.com',
                password_hash: 'hash',
                name: 'Test User',
                EmailChange: {
                    create: {
                        new_email: 'taken@example.com',
                        code: 'CODE123',
                        expires_at: new Date(Date.now() + 10 * 60 * 1000),
                    },
                },
            },
        })
        await prisma.user.create({
            data: {
                id: 'user-2',
                email: 'taken@example.com',
                password_hash: 'hash',
                name: 'Other User',
            },
        })

        const useCase = new ConfirmEmailChangeUseCase(
            new PrismaUsersRepository(prisma),
        )

        await expect(
            useCase.execute({ userId: 'user-1', code: 'CODE123' }),
        ).rejects.toThrow(EmailUnavailableError)

        const user = await prisma.user.findUnique({ where: { id: 'user-1' } })
        expect(user?.email).toBe('original@example.com')
    })
})