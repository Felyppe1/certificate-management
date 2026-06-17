import { describe, expect, it, vi, beforeEach } from 'vitest'
import { RequestPasswordResetUseCase } from './index'
import { UserNotFoundError } from '../../domain/error/not-found-error/user-not-found-error'
import { IUsersRepository } from '../interfaces/repository/iusers-repository'
import { INotificationGateway } from '../interfaces/inotification-gateway'

function createUserMock(overrides: Record<string, unknown> = {}) {
    return {
        generateResetPasswordCode: vi.fn(),
        getResetPasswordCode: vi.fn().mockReturnValue('RESET123'),
        ...overrides,
    }
}

describe('RequestPasswordResetUseCase', () => {
    const usersRepository: Pick<IUsersRepository, 'getByEmail' | 'update'> = {
        getByEmail: vi.fn(),
        update: vi.fn(),
    }

    const notificationGateway: Pick<INotificationGateway, 'sendEmail'> = {
        sendEmail: vi.fn(),
    }

    let useCase: RequestPasswordResetUseCase

    beforeEach(() => {
        vi.clearAllMocks()
        useCase = new RequestPasswordResetUseCase(
            usersRepository,
            notificationGateway,
        )
    })

    it('deve lançar erro quando o e-mail não estiver cadastrado', async () => {
        vi.mocked(usersRepository.getByEmail).mockResolvedValue(null)

        await expect(
            useCase.execute({ email: 'naoexiste@example.com' }),
        ).rejects.toThrow(UserNotFoundError)
    })

    it('deve gerar código de reset, atualizar o usuário e enviar e-mail no caminho feliz', async () => {
        const user = createUserMock()
        vi.mocked(usersRepository.getByEmail).mockResolvedValue(user as any)
        vi.mocked(usersRepository.update).mockResolvedValue(undefined)

        await useCase.execute({ email: 'user@example.com' })

        expect(user.generateResetPasswordCode).toHaveBeenCalledOnce()
        expect(usersRepository.update).toHaveBeenCalledWith(user)
        expect(notificationGateway.sendEmail).toHaveBeenCalledOnce()
        expect(notificationGateway.sendEmail).toHaveBeenCalledWith(
            'user@example.com',
            expect.any(String),
            expect.any(String),
            expect.stringContaining('RESET123'),
        )
    })
})
