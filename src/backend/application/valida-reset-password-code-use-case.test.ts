import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ValidateResetPasswordCodeUseCase } from './valida-reset-password-code-use-case'
import { UserNotFoundError } from '../domain/error/not-found-error/user-not-found-error'

function createUserMock(overrides: Record<string, unknown> = {}) {
    return {
        getId: () => 'user-id',
        validateResetPasswordCode: vi.fn(),
        ...overrides,
    }
}

describe('ValidateResetPasswordCodeUseCase', () => {
    const usersRepository = {
        getByEmail: vi.fn(),
    }

    let useCase: ValidateResetPasswordCodeUseCase

    beforeEach(() => {
        vi.clearAllMocks()
        useCase = new ValidateResetPasswordCodeUseCase(usersRepository)
    })

    it('deve lançar erro se o usuário não for encontrado', async () => {
        usersRepository.getByEmail.mockResolvedValue(null)

        await expect(
            useCase.execute({ email: 'nao@existe.com', code: '123456' }),
        ).rejects.toThrow(UserNotFoundError)
    })

    it('deve validar o código sem lançar erro no caminho feliz', async () => {
        const user = createUserMock()
        usersRepository.getByEmail.mockResolvedValue(user)

        await expect(
            useCase.execute({ email: 'user@example.com', code: '123456' }),
        ).resolves.not.toThrow()

        expect(user.validateResetPasswordCode).toHaveBeenCalledWith('123456')
    })
})