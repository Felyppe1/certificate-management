import { describe, expect, it } from 'vitest'
import { prisma } from '@/tests/setup.integration'
import { RequestEmailChangeUseCase } from '@/backend/application/request-email-change-use-case'
import { PrismaUsersRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-users-repository'
import { INotificationGateway } from '@/backend/application/interfaces/gateway/inotification-gateway'
import { EmailUnavailableError } from '@/backend/domain/error/conflict-error/email-unavailable-error'

class NotificationStub implements Pick<INotificationGateway, 'sendEmail'> {
    async sendEmail() {}
}

describe('RequestEmailChangeUseCase (Integração)', () => {
    it('deve criar o registro de solicitação de troca de e-mail no banco', async () => {
        await prisma.user.create({
            data: {
                id: 'user-1',
                email: 'user@example.com',
                password_hash: 'hash',
                name: 'Test User',
                is_email_verified: true,
            },
        })

        const useCase = new RequestEmailChangeUseCase(
            new PrismaUsersRepository(prisma),
            new NotificationStub(),
        )

        await useCase.execute({ userId: 'user-1', newEmail: 'new@example.com' })

        const emailChange = await prisma.emailChange.findUnique({
            where: { user_id: 'user-1' },
        })
        expect(emailChange?.new_email).toBe('new@example.com')
    })

    it('deve impedir solicitação quando o novo e-mail já pertence a outro usuário', async () => {
        await prisma.user.create({
            data: {
                id: 'user-1',
                email: 'user@example.com',
                password_hash: 'hash',
                name: 'Test User',
                is_email_verified: true,
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

        const useCase = new RequestEmailChangeUseCase(
            new PrismaUsersRepository(prisma),
            new NotificationStub(),
        )

        await expect(
            useCase.execute({
                userId: 'user-1',
                newEmail: 'taken@example.com',
            }),
        ).rejects.toThrow(EmailUnavailableError)

        const emailChange = await prisma.emailChange.findUnique({
            where: { user_id: 'user-1' },
        })
        expect(emailChange).toBeNull()
    })
})
