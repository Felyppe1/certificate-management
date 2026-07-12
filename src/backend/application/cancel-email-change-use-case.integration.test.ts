import { describe, expect, it } from 'vitest'
import { prisma } from '@/tests/setup.integration'
import { CancelEmailChangeUseCase } from '@/backend/application/cancel-email-change-use-case'
import { PrismaUsersRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-users-repository'

describe('CancelEmailChangeUseCase (Integração)', () => {
    it('deve remover a solicitação de troca de e-mail pendente do banco', async () => {
        await prisma.user.create({
            data: {
                id: 'user-1',
                email: 'user@example.com',
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

        const useCase = new CancelEmailChangeUseCase(
            new PrismaUsersRepository(prisma),
        )

        await useCase.execute({ userId: 'user-1' })

        const emailChange = await prisma.emailChange.findUnique({
            where: { user_id: 'user-1' },
        })
        expect(emailChange).toBeNull()
    })
})
