import { describe, expect, it, vi, beforeEach } from 'vitest'
import { VerifyEmailUseCase } from './verify-email-use-case'
import { EmailVerificationCodeNotFoundError } from '../domain/error/not-found-error/email-verification-code-not-found-error'

function createUserMock(overrides: Record<string, unknown> = {}) {
    return {
        getId: () => 'user-id',
        verifyEmail: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    }
}

describe('VerifyEmailUseCase', () => {
    const usersRepository = {
        getByEmail: vi.fn(),
        update: vi.fn(),
    }

    const sessionsRepository = {
        save: vi.fn(),
    }

    const transactionManager = {
        run: vi.fn(async (fn: any) => fn()),
    }

    let useCase: VerifyEmailUseCase

    beforeEach(() => {
        vi.clearAllMocks()
        useCase = new VerifyEmailUseCase(
            usersRepository,
            sessionsRepository,
            transactionManager,
        )
    })

    it('deve lançar erro se o usuário não for encontrado pelo email', async () => {
        usersRepository.getByEmail.mockResolvedValue(null)

        await expect(
            useCase.execute({ email: 'nao@existe.com', code: '123456' }),
        ).rejects.toThrow(EmailVerificationCodeNotFoundError)
    })

    it('deve verificar email, criar sessão e retornar sessionToken no caminho feliz', async () => {
        const user = createUserMock()
        usersRepository.getByEmail.mockResolvedValue(user)

        const result = await useCase.execute({ email: 'user@example.com', code: '123456' })

        expect(user.verifyEmail).toHaveBeenCalledWith('123456')
        expect(usersRepository.update).toHaveBeenCalledWith(user)
        expect(sessionsRepository.save).toHaveBeenCalled()
        expect(result.sessionToken).toBeDefined()
    })
})