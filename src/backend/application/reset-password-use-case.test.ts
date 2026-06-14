import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ResetPasswordUseCase } from './reset-password-use-case'
import { UserNotFoundError } from '../domain/error/not-found-error/user-not-found-error'

function createUserMock(overrides: Record<string, unknown> = {}) {
    return {
        getId: () => 'user-id',
        resetPassword: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    }
}

describe('ResetPasswordUseCase', () => {
    const usersRepository = {
        getByEmail: vi.fn(),
        update: vi.fn(),
    }

    let useCase: ResetPasswordUseCase

    beforeEach(() => {
        vi.clearAllMocks()
        useCase = new ResetPasswordUseCase(usersRepository)
    })

    it('deve lançar erro se o usuário não for encontrado', async () => {
        usersRepository.getByEmail.mockResolvedValue(null)

        await expect(
            useCase.execute({ email: 'nao@existe.com', code: '123456', newPassword: 'nova' }),
        ).rejects.toThrow(UserNotFoundError)
    })

    it('deve redefinir senha e persistir usuário no caminho feliz', async () => {
        const user = createUserMock()
        usersRepository.getByEmail.mockResolvedValue(user)

        await useCase.execute({ email: 'user@example.com', code: '123456', newPassword: 'nova' })

        expect(user.resetPassword).toHaveBeenCalledWith('123456', 'nova')
        expect(usersRepository.update).toHaveBeenCalledWith(user)
    })
})