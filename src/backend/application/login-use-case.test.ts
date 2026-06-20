import { describe, expect, it, vi, beforeEach, Mock } from 'vitest'
import { LoginUseCase } from './login-use-case'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { ISessionsRepository } from './interfaces/repository/isessions-repository'
import { IncorrectCredentialsError } from '../domain/error/authentication-error/incorrect-credentials-error'
import { EmailNotVerifiedError } from '../domain/error/forbidden-error/email-not-verified-error'
import { User, UserInput } from '../domain/user'

function createUser(overrides?: Partial<UserInput>): User {
    return new User({
        id: 'user-id',
        email: 'user@example.com',
        isEmailVerified: true,
        name: 'Nome',
        passwordHash: 'hash',
        credits: 300,
        externalAccounts: [],
        emailVerificationCode: null,
        resetPasswordCode: null,
        emailChangeCode: null,
        ...overrides,
    })
}

describe('LoginUseCase', () => {
    let usersRepository: { getByEmail: Mock<IUsersRepository['getByEmail']> }
    let sessionsRepository: { save: Mock<ISessionsRepository['save']> }

    let useCase: LoginUseCase

    beforeEach(() => {
        usersRepository = { getByEmail: vi.fn().mockResolvedValue(null) }
        sessionsRepository = { save: vi.fn() }
        useCase = new LoginUseCase(usersRepository, sessionsRepository)
    })

    it('deve lançar erro se o usuário não existir', async () => {
        await expect(
            useCase.execute('naoexiste@example.com', 'senha'),
        ).rejects.toThrow(IncorrectCredentialsError)
    })

    it('deve lançar erro se a senha estiver incorreta', async () => {
        const user = createUser()
        usersRepository.getByEmail.mockResolvedValue(user)
        vi.spyOn(user, 'comparePassword').mockResolvedValue(false)

        await expect(
            useCase.execute('user@example.com', 'senhaerrada'),
        ).rejects.toThrow(IncorrectCredentialsError)
    })

    it('deve lançar erro se o email não estiver verificado', async () => {
        const user = createUser({ isEmailVerified: false })
        usersRepository.getByEmail.mockResolvedValue(user)
        vi.spyOn(user, 'comparePassword').mockResolvedValue(true)

        await expect(
            useCase.execute('user@example.com', 'senha'),
        ).rejects.toThrow(EmailNotVerifiedError)
    })

    it('deve retornar token e dados do usuário no caminho feliz', async () => {
        const user = createUser()
        usersRepository.getByEmail.mockResolvedValue(user)
        vi.spyOn(user, 'comparePassword').mockResolvedValue(true)

        const result = await useCase.execute('user@example.com', 'senha')

        expect(result.token).toBeDefined()
        expect(result.user.id).toBe('user-id')
        expect(result.user.name).toBe('Nome')
        expect(result.user.email).toBe('user@example.com')
        expect(sessionsRepository.save).toHaveBeenCalled()
    })
})
