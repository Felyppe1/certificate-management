import { describe, expect, it, vi, beforeEach } from 'vitest'
import { RequestEmailChangeUseCase } from './index'
import { UserNotFoundError } from '../../domain/error/authentication-error/user-not-found-error'
import { EmailUnavailableError } from '../../domain/error/conflict-error/email-unavailable-error'
import { IUsersRepository } from '../interfaces/repository/write/iusers-repository'
import { INotificationGateway } from '../interfaces/gateway/inotification-gateway'

function createUserMock(overrides: Record<string, unknown> = {}) {
    return {
        getId: () => 'user-id',
        changeEmail: vi.fn(),
        getEmailChangeCode: vi.fn().mockReturnValue('CODE123'),
        ...overrides,
    }
}

describe('RequestEmailChangeUseCase', () => {
    const usersRepository: Pick<
        IUsersRepository,
        'getById' | 'getByEmail' | 'update'
    > = {
        getById: vi.fn(),
        getByEmail: vi.fn(),
        update: vi.fn(),
    }

    const notificationGateway: Pick<INotificationGateway, 'sendEmail'> = {
        sendEmail: vi.fn(),
    }

    let useCase: RequestEmailChangeUseCase

    beforeEach(() => {
        vi.clearAllMocks()
        useCase = new RequestEmailChangeUseCase(
            usersRepository,
            notificationGateway,
        )
    })

    it('deve lançar erro quando o usuário não for encontrado', async () => {
        vi.mocked(usersRepository.getById).mockResolvedValue(null)

        await expect(
            useCase.execute({
                userId: 'user-id',
                newEmail: 'novo@example.com',
            }),
        ).rejects.toThrow(UserNotFoundError)
    })

    it('deve lançar erro quando o e-mail já pertencer a outro usuário', async () => {
        const user = createUserMock()
        const otherUser = createUserMock({ getId: () => 'other-user-id' })
        vi.mocked(usersRepository.getById).mockResolvedValue(user as any)
        vi.mocked(usersRepository.getByEmail).mockResolvedValue(
            otherUser as any,
        )

        await expect(
            useCase.execute({
                userId: 'user-id',
                newEmail: 'existente@example.com',
            }),
        ).rejects.toThrow(EmailUnavailableError)
    })

    it('deve permitir usar o e-mail do próprio usuário (existingUser.getId() === userId)', async () => {
        const user = createUserMock()
        const sameUser = createUserMock()
        vi.mocked(usersRepository.getById).mockResolvedValue(user as any)
        vi.mocked(usersRepository.getByEmail).mockResolvedValue(sameUser as any)
        vi.mocked(usersRepository.update).mockResolvedValue(undefined)

        await expect(
            useCase.execute({
                userId: 'user-id',
                newEmail: 'mesmo@example.com',
            }),
        ).resolves.not.toThrow()
    })

    it('deve atualizar o usuário e enviar e-mail de verificação no caminho feliz', async () => {
        const user = createUserMock()
        vi.mocked(usersRepository.getById).mockResolvedValue(user as any)
        vi.mocked(usersRepository.getByEmail).mockResolvedValue(null)
        vi.mocked(usersRepository.update).mockResolvedValue(undefined)

        await useCase.execute({
            userId: 'user-id',
            newEmail: 'novo@example.com',
        })

        expect(user.changeEmail).toHaveBeenCalledWith('novo@example.com')
        expect(usersRepository.update).toHaveBeenCalledWith(user)
        expect(notificationGateway.sendEmail).toHaveBeenCalledOnce()
        expect(notificationGateway.sendEmail).toHaveBeenCalledWith(
            'novo@example.com',
            expect.any(String),
            expect.any(String),
            expect.stringContaining('CODE123'),
        )
    })
})
