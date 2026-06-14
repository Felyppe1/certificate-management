import { describe, expect, it, vi, beforeEach } from 'vitest'
import { LoginUseCase } from './login-use-case'
import { IncorrectCredentialsError } from '../domain/error/authentication-error/incorrect-credentials-error'
import { EmailNotVerifiedError } from '../domain/error/forbidden-error/email-not-verified-error'

function createUserMock(overrides: Record<string, unknown> = {}) {
    return {
        getId: () => 'user-id',
        getName: () => 'Nome',
        getEmail: () => 'user@example.com',
        comparePassword: vi.fn().mockResolvedValue(true),
        hasVerifiedEmailAccess: vi.fn().mockReturnValue(true),
        ...overrides,
    }
}

describe('LoginUseCase', () => {
    const usersRepository = {
        getByEmail: vi.fn(),
    }

    const sessionsRepository = {
        save: vi.fn(),
    }

    let useCase: LoginUseCase

    beforeEach(() => {
        vi.clearAllMocks()
        useCase = new LoginUseCase(usersRepository, sessionsRepository)
    })

    it('deve lançar erro se o usuário não existir', async () => {
        usersRepository.getByEmail.mockResolvedValue(null)

        await expect(
            useCase.execute('naoexiste@example.com', 'senha'),
        ).rejects.toThrow(IncorrectCredentialsError)
    })

    it('deve lançar erro se a senha estiver incorreta', async () => {
        const user = createUserMock({
            comparePassword: vi.fn().mockResolvedValue(false),
        })
        usersRepository.getByEmail.mockResolvedValue(user)

        await expect(
            useCase.execute('user@example.com', 'senhaerrada'),
        ).rejects.toThrow(IncorrectCredentialsError)
    })

    it('deve lançar erro se o email não estiver verificado', async () => {
        const user = createUserMock({
            hasVerifiedEmailAccess: vi.fn().mockReturnValue(false),
        })
        usersRepository.getByEmail.mockResolvedValue(user)

        await expect(
            useCase.execute('user@example.com', 'senha'),
        ).rejects.toThrow(EmailNotVerifiedError)
    })

    it('deve retornar token e dados do usuário no caminho feliz', async () => {
        const user = createUserMock()
        usersRepository.getByEmail.mockResolvedValue(user)

        const result = await useCase.execute('user@example.com', 'senha')

        expect(result.token).toBeDefined()
        expect(result.user.id).toBe('user-id')
        expect(result.user.name).toBe('Nome')
        expect(result.user.email).toBe('user@example.com')
        expect(sessionsRepository.save).toHaveBeenCalled()
    })
})